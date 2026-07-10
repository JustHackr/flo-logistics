"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type RoutingStatus = {
  configured: boolean;
  connected: boolean;
  provider: "routes" | "distance_matrix" | null;
  hasTraffic: boolean;
  message: string;
  sampleDistanceKm?: number;
  sampleDurationMin?: number;
  osrmReachable?: boolean;
  primarySource?: "google_traffic" | "osrm_traffic" | "estimated";
  primarySourceLabel?: string;
  googleOptional?: boolean;
  mapVisualizationConfigured?: boolean;
  mapVisualizationMessage?: string;
};

export function GoogleMapsStatusBanner() {
  const [status, setStatus] = useState<RoutingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showGoogleUpgrade, setShowGoogleUpgrade] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/routing/maps/status");
        const data = (await res.json()) as RoutingStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) {
          setStatus({
            configured: false,
            connected: false,
            provider: null,
            hasTraffic: false,
            message:
              "Using local Jakarta traffic estimates. Could not reach routing status API.",
            primarySource: "estimated",
            primarySourceLabel: "Jakarta traffic model (local estimates)",
            osrmReachable: false,
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

  if (process.env.NODE_ENV === "production") {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-3 text-sm text-muted-foreground">
          Checking routing data sources...
        </CardContent>
      </Card>
    );
  }

  if (!status) return null;

  if (status.connected) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Google Maps enabled</span>
              <Badge variant="secondary">
                {status.hasTraffic ? "Live traffic" : "Road network"}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{status.message}</p>
            {status.sampleDistanceKm != null && status.sampleDurationMin != null && (
              <p className="mt-1 text-xs text-muted-foreground">
                Sample leg (Blok M → Sudirman): {status.sampleDistanceKm} km, ~
                {Math.round(status.sampleDurationMin)} min
              </p>
            )}
            {status.mapVisualizationConfigured && (
              <p className="mt-1 text-xs text-muted-foreground">
                {status.mapVisualizationMessage ??
                  "Route maps enabled (Maps JavaScript + Directions API)."}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const isEstimatedFallback = status.primarySource === "estimated";

  return (
    <Card
      className={
        isEstimatedFallback
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-emerald-500/30 bg-emerald-500/5"
      }
    >
      <CardContent className="space-y-3 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Routing data source</span>
            <Badge variant={isEstimatedFallback ? "outline" : "secondary"}>
              {status.primarySourceLabel ?? "OSRM + Jakarta traffic"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{status.message}</p>
        </div>

        {status.googleOptional && (
          <div>
            <button
              type="button"
              className="text-xs font-medium text-muted-foreground underline hover:text-foreground"
              onClick={() => setShowGoogleUpgrade((v) => !v)}
            >
              {showGoogleUpgrade ? "Hide" : "Optional: upgrade to Google Maps live traffic"}
            </button>
            {showGoogleUpgrade && (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                <li>
                  Create an API key in{" "}
                  <a
                    className="font-medium text-foreground underline"
                    href="https://console.cloud.google.com/google/maps-apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Google Cloud Console
                  </a>{" "}
                  (billing required)
                </li>
                <li>
                  Enable <strong>Routes API</strong>,{" "}
                  <strong>Distance Matrix API</strong>, and{" "}
                  <strong>Maps JavaScript API</strong>
                </li>
                <li>
                  Add to <code className="rounded bg-muted px-1">.env.local</code>:{" "}
                  <code className="rounded bg-muted px-1">
                    GOOGLE_MAPS_API_KEY=your_key
                  </code>{" "}
                  and{" "}
                  <code className="rounded bg-muted px-1">
                    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
                  </code>
                </li>
                <li>
                  Restart <code className="rounded bg-muted px-1">npm run dev</code>
                </li>
              </ol>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
