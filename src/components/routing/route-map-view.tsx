"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APIProvider,
  APILoadingStatus,
  Map,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { RouteWaypoint } from "@/lib/routing/waypoints";
import { waypointsToRoutePath } from "@/lib/routing/waypoints";
import { MapPin } from "lucide-react";
import { useI18n } from "@/components/i18n/use-i18n";

const JAKARTA_CENTER = { lat: -6.2148, lng: 106.827 };
const MAP_LIBRARIES = ["maps"] as const;

type MapsJsConfig =
  | { configured: true; apiKey: string }
  | { configured: false; message?: string };

function useMapsJsConfig() {
  const [config, setConfig] = useState<MapsJsConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/routing/maps/js-config");
        const json = (await res.json()) as MapsJsConfig & {
          error?: string;
          message?: string;
          apiKey?: string;
        };
        if (cancelled) return;
        if (
          res.ok &&
          json.configured === true &&
          typeof json.apiKey === "string" &&
          json.apiKey.length > 0
        ) {
          setConfig({ configured: true, apiKey: json.apiKey });
        } else {
          setConfig({
            configured: false,
            message:
              json.message ??
              "Interactive Google Maps is not available for this demo.",
          });
        }
      } catch {
        if (!cancelled) {
          setConfig({
            configured: false,
            message: "Could not load map configuration.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { config, loading };
}

function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/** Loads a traffic-aware road path via the server Routes API. */
function RoadPathLoader({
  waypoints,
  enabled,
  onResolved,
}: {
  waypoints: RouteWaypoint[];
  enabled: boolean;
  onResolved: (path: google.maps.LatLngLiteral[] | null) => void;
}) {
  useEffect(() => {
    if (!enabled || waypoints.length < 2) {
      onResolved(null);
      return;
    }

    let cancelled = false;

    async function loadRoute() {
      try {
        const res = await fetch("/api/routing/routes/polyline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: waypoints.map((wp) => ({ lat: wp.lat, lng: wp.lng })),
          }),
        });

        if (cancelled) return;

        if (!res.ok) {
          onResolved(null);
          return;
        }

        const json = (await res.json()) as { encodedPolyline?: string | null };
        if (!json.encodedPolyline) {
          onResolved(null);
          return;
        }

        onResolved(decodePolyline(json.encodedPolyline));
      } catch {
        if (!cancelled) onResolved(null);
      }
    }

    void loadRoute();

    return () => {
      cancelled = true;
    };
  }, [enabled, onResolved, waypoints]);

  return null;
}

function RoutePolyline({
  path,
  source,
}: {
  path: google.maps.LatLngLiteral[];
  source: "google_routes" | "estimated";
}) {
  const map = useMap();
  const maps = useMapsLibrary("maps");

  useEffect(() => {
    if (!map || !maps || path.length < 2) return;

    const isRoadNetwork = source === "google_routes";

    const polyline = new maps.Polyline({
      path,
      geodesic: !isRoadNetwork,
      strokeColor: isRoadNetwork ? "#2563eb" : "#64748b",
      strokeOpacity: isRoadNetwork ? 0.9 : 0.7,
      strokeWeight: isRoadNetwork ? 4 : 3,
      ...(isRoadNetwork
        ? {}
        : {
            icons: [
              {
                icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 },
                offset: "0",
                repeat: "12px",
              },
            ],
          }),
    });

    polyline.setMap(map);

    const lats = path.map((p) => p.lat);
    const lngs = path.map((p) => p.lng);
    map.fitBounds(
      {
        north: Math.max(...lats),
        south: Math.min(...lats),
        east: Math.max(...lngs),
        west: Math.min(...lngs),
      },
      48
    );

    return () => {
      polyline.setMap(null);
    };
  }, [map, maps, path, source]);

  return null;
}

function RouteMarkers({ waypoints }: { waypoints: RouteWaypoint[] }) {
  return (
    <>
      {waypoints.map((wp) => {
        const label =
          wp.stopType === "warehouse"
            ? wp.role === "departure"
              ? "W"
              : "R"
            : String(wp.sequence);

        return (
          <Marker
            key={`${wp.stopType}-${wp.sequence}-${wp.stopType === "delivery" ? wp.orderId : wp.role}`}
            position={{ lat: wp.lat, lng: wp.lng }}
            label={{
              text: label,
              color: "#ffffff",
              fontWeight: "700",
              fontSize: "11px",
            }}
            title={
              wp.stopType === "warehouse"
                ? `${wp.name} (${wp.role})`
                : wp.recipientAddress
            }
          />
        );
      })}
    </>
  );
}

function RouteMapInner({
  waypoints,
  encodedPolyline,
}: {
  waypoints: RouteWaypoint[];
  encodedPolyline?: string | null;
}) {
  const [fetchedPath, setFetchedPath] = useState<
    google.maps.LatLngLiteral[] | null
  >(null);
  const [fetchSettled, setFetchSettled] = useState(Boolean(encodedPolyline));

  const handleRoadPath = useCallback((path: google.maps.LatLngLiteral[] | null) => {
    setFetchedPath(path);
    setFetchSettled(true);
  }, []);

  const { path, source, showPolyline } = useMemo(() => {
    if (encodedPolyline) {
      try {
        return {
          path: decodePolyline(encodedPolyline),
          source: "google_routes" as const,
          showPolyline: true,
        };
      } catch {
        /* fall through */
      }
    }

    if (fetchedPath && fetchedPath.length >= 2) {
      return {
        path: fetchedPath,
        source: "google_routes" as const,
        showPolyline: true,
      };
    }

    if (!fetchSettled) {
      return {
        path: [],
        source: "estimated" as const,
        showPolyline: false,
      };
    }

    return {
      path: waypointsToRoutePath(waypoints),
      source: "estimated" as const,
      showPolyline: true,
    };
  }, [encodedPolyline, fetchSettled, fetchedPath, waypoints]);

  const center = waypoints[0]
    ? { lat: waypoints[0].lat, lng: waypoints[0].lng }
    : JAKARTA_CENTER;

  const shouldFetchRoadPath = !encodedPolyline && waypoints.length >= 2;

  return (
    <Map
      defaultCenter={center}
      defaultZoom={12}
      gestureHandling="cooperative"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      className="h-full w-full"
    >
      <RouteMarkers waypoints={waypoints} />
      {shouldFetchRoadPath && (
        <RoadPathLoader
          waypoints={waypoints}
          enabled={shouldFetchRoadPath}
          onResolved={handleRoadPath}
        />
      )}
      {showPolyline && path.length >= 2 && (
        <RoutePolyline path={path} source={source} />
      )}
    </Map>
  );
}

export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const { config, loading } = useMapsJsConfig();
  const { locale } = useI18n();

  if (loading || !config?.configured) {
    return <>{children}</>;
  }

  return (
    <APIProvider
      apiKey={config.apiKey}
      language={locale === "id" ? "id" : "en"}
      region="ID"
      libraries={[...MAP_LIBRARIES]}
    >
      {children}
    </APIProvider>
  );
}

export function RouteMapView({
  waypoints,
  encodedPolyline,
  className,
}: {
  waypoints: RouteWaypoint[];
  encodedPolyline?: string | null;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const { config, loading } = useMapsJsConfig();
  const apiLoadingStatus = useApiLoadingStatus();
  const withinProvider = apiLoadingStatus !== APILoadingStatus.NOT_LOADED;

  if (waypoints.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center ${className ?? "h-64"}`}
      >
        <div className="space-y-2">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t("routing.map.unavailable")}</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {t("routing.map.noWaypoints")}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center ${className ?? "h-64"}`}
      >
        <div className="space-y-2">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t("routing.map.loading")}</p>
        </div>
      </div>
    );
  }

  if (!config?.configured) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center ${className ?? "h-64"}`}
      >
        <div className="space-y-2">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">{t("routing.map.unavailable")}</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {config?.message ?? t("routing.map.notConfigured")}
          </p>
        </div>
      </div>
    );
  }

  const mapContent = (
    <div className={`overflow-hidden rounded-lg border ${className ?? "h-72"}`}>
      <RouteMapInner waypoints={waypoints} encodedPolyline={encodedPolyline} />
    </div>
  );

  if (withinProvider) {
    return mapContent;
  }

  return (
    <APIProvider
      apiKey={config.apiKey}
      language={locale === "id" ? "id" : "en"}
      region="ID"
      libraries={[...MAP_LIBRARIES]}
    >
      {mapContent}
    </APIProvider>
  );
}
