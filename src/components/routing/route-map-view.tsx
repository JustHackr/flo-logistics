"use client";

import { useEffect, useMemo } from "react";
import {
  APIProvider,
  Map,
  Marker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import type { RouteWaypoint } from "@/lib/routing/waypoints";
import { waypointsToRoutePath } from "@/lib/routing/waypoints";
import { isPublicGoogleMapsConfigured } from "@/lib/routing/google-maps";
import { MapPin } from "lucide-react";

const JAKARTA_CENTER = { lat: -6.2148, lng: 106.827 };

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

function RoutePolyline({
  waypoints,
  encodedPolyline,
}: {
  waypoints: RouteWaypoint[];
  encodedPolyline?: string | null;
}) {
  const map = useMap();
  const maps = useMapsLibrary("maps");

  const path = useMemo(() => {
    if (encodedPolyline) {
      try {
        return decodePolyline(encodedPolyline);
      } catch {
        return waypointsToRoutePath(waypoints);
      }
    }
    return waypointsToRoutePath(waypoints);
  }, [encodedPolyline, waypoints]);

  useEffect(() => {
    if (!map || !maps || path.length < 2) return;

    const polyline = new maps.Polyline({
      path,
      geodesic: !encodedPolyline,
      strokeColor: encodedPolyline ? "#2563eb" : "#64748b",
      strokeOpacity: encodedPolyline ? 0.9 : 0.7,
      strokeWeight: encodedPolyline ? 4 : 3,
      ...(encodedPolyline
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
  }, [map, maps, path, encodedPolyline]);

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
  const center = waypoints[0]
    ? { lat: waypoints[0].lat, lng: waypoints[0].lng }
    : JAKARTA_CENTER;

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
      <RoutePolyline waypoints={waypoints} encodedPolyline={encodedPolyline} />
    </Map>
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
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  if (!isPublicGoogleMapsConfigured() || waypoints.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center ${className ?? "h-64"}`}
      >
        <div className="space-y-2">
          <MapPin className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">Route map unavailable</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {waypoints.length === 0
              ? "No waypoints to display."
              : "Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to .env.local and enable Maps JavaScript API to view the route on Google Maps."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-lg border ${className ?? "h-72"}`}>
      <APIProvider apiKey={apiKey} language="id" region="ID">
        <RouteMapInner waypoints={waypoints} encodedPolyline={encodedPolyline} />
      </APIProvider>
    </div>
  );
}
