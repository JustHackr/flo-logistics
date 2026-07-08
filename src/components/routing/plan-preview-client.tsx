"use client";

import { useEffect, useMemo, useState } from "react";
import type { TrafficSource } from "@/lib/routing/estimator";
import type { RouteWaypoint } from "@/lib/routing/waypoints";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GoogleMapsStatusBanner } from "./google-maps-status-banner";
import { OptimizedRoutePreview } from "./plan-preview-utils";
import { DispatchMatchingPanel } from "./dispatch-matching-panel";
import type { DriverMatchingResult } from "@/lib/routing/driver-matching";

export type RoutingPlanStop = {
  sequence: number;
  orderId: string;
  recipientAddress: string;
  lat?: number;
  lng?: number;
  etaAt: string | null;
  distanceKm: number;
  durationMin: number;
  serviceTimeMin?: number;
};

export type RoutingPlanPreview = {
  driver: {
    id: string;
    name: string;
    phone: string | null;
    employeeId: string | null;
    licenseNumber: string | null;
    status: string;
  };
  vehicle: {
    id: string;
    name: string;
    vehicleType: string;
    engineType: string;
    odometerKm: number;
    vehicleAgeYears: number;
    maintenanceCostUnit: number;
    vqi: number;
    riskLevel: "low" | "medium" | "high";
    recommendedAction: string | null;
  };
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedEmissionsKg: number;
  fuelCostIdr?: number;
  baselineFuelCostIdr?: number;
  fuelCostSavingsIdr?: number;
  fuelCostSavingsPercent?: number;
  fuelProductName?: string;
  trafficSource?: TrafficSource;
  stops: RoutingPlanStop[];
  waypoints?: RouteWaypoint[];
  encodedPolyline?: string | null;
  matching?: {
    vehicleType: "car" | "motorcycle";
    selectedRank: number;
    totalCandidates: number;
    selectionReason: string;
  };
};

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PlanPreviewClient({ orderIds }: { orderIds: string[] }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<RoutingPlanPreview[]>([]);
  const [trafficSourceLabel, setTrafficSourceLabel] = useState<string | null>(
    null
  );
  const [dispatchMatching, setDispatchMatching] = useState<{
    car: DriverMatchingResult | null;
    motorcycle: DriverMatchingResult | null;
  } | null>(null);
  const [routeStartAt, setRouteStartAt] = useState(() =>
    toDatetimeLocalValue(new Date())
  );

  const orderIdsNormalized = useMemo(
    () => Array.from(new Set(orderIds)).filter(Boolean),
    [orderIds]
  );

  useEffect(() => {
    if (orderIdsNormalized.length === 0) return;
    void preview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdsNormalized.join(","), routeStartAt]);

  async function preview() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/routing/routes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: orderIdsNormalized,
          dryRun: true,
          maxStopsPerRoute: 15,
          routeStartAt: new Date(routeStartAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to optimize route");
      setPlans(data.plans ?? []);
      setTrafficSourceLabel(data.trafficSourceLabel ?? null);
      setDispatchMatching(data.dispatchMatching ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to optimize route");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/routing/routes/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: orderIdsNormalized,
          dryRun: false,
          maxStopsPerRoute: 15,
          routeStartAt: new Date(routeStartAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to save route plan");
      router.push("/routing/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save route plan");
    } finally {
      setSaving(false);
    }
  }

  if (orderIdsNormalized.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Plan Route</h2>
        <p className="text-muted-foreground">
          No orders were selected. Go back to{" "}
          <span className="font-medium">Routing Orders</span> and select some
          orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <GoogleMapsStatusBanner />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Plan Route (Process)
            </h2>
            <p className="text-muted-foreground">
              Sorts waypoints using OSRM road distances and Jakarta rush-hour
              traffic calibration. Produces one or more route plans (max 15 stops
              per route).
            </p>
            {trafficSourceLabel && (
              <p className="mt-2 text-sm text-muted-foreground">
                Traffic data:{" "}
                <span className="font-medium text-foreground">
                  {trafficSourceLabel}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="route-start-at"
              className="text-sm font-medium"
            >
              Route start time
            </label>
            <input
              id="route-start-at"
              type="datetime-local"
              className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm"
              value={routeStartAt}
              onChange={(e) => setRouteStartAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Rush-hour departures (e.g. weekday 08:00) produce longer leg times.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/routing/orders")}
          >
            Back
          </Button>
          <Button
            onClick={() => void save()}
            disabled={saving || loading || plans.length === 0}
          >
            {saving ? "Saving..." : "Save Route Plan(s)"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-muted-foreground">Optimizing...</div>
      )}

      {!loading && plans.length === 0 && (
        <div className="text-sm text-muted-foreground">
          No route could be generated for these orders.
        </div>
      )}

      {!loading && dispatchMatching && (
        <DispatchMatchingPanel dispatchMatching={dispatchMatching} />
      )}

      <div className="space-y-4">
        {plans.map((plan, idx) => (
          <OptimizedRoutePreview key={`${plan.driver.id}-${idx}`} plan={plan} />
        ))}
      </div>
    </div>
  );
}
