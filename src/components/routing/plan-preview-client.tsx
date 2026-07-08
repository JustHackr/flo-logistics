"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";
import {
  OptimizedRoutePreview,
  RoutePlanStopRow,
  formatMinutes,
} from "./plan-preview-utils";

type StopAccess = "CAR_ONLY" | "MOTORCYCLE_ONLY" | "BOTH";

type OrderStatus =
  | "RECEIVED"
  | "PREPARING"
  | "ON_ROUTE"
  | "ETA"
  | "DELIVERED";

export type RoutingPlanStop = {
  sequence: number;
  orderId: string;
  recipientAddress: string;
  etaAt: string | null;
  distanceKm: number;
  durationMin: number;
};

export type RoutingPlanPreview = {
  driverId: string;
  vehicle: {
    id: string;
    vehicleType: string;
    engineType: string;
    odometerKm: number;
    vqi: number;
    riskLevel: "low" | "medium" | "high";
  };
  totalDistanceKm: number;
  totalDurationMin: number;
  estimatedEmissionsKg: number;
  stops: RoutingPlanStop[];
};

export function PlanPreviewClient({ orderIds }: { orderIds: string[] }) {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<RoutingPlanPreview[]>([]);

  const orderIdsNormalized = useMemo(
    () => Array.from(new Set(orderIds)).filter(Boolean),
    [orderIds]
  );

  useEffect(() => {
    if (orderIdsNormalized.length === 0) return;
    void preview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderIdsNormalized.join(",")]);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed to optimize route");
      setPlans(data.plans ?? []);
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
          No orders were selected. Go back to <span className="font-medium">Routing Orders</span> and select some orders.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plan Route (Process)</h2>
          <p className="text-muted-foreground">
            This step sorts waypoints using mock traffic estimation, estimates ETAs, and produces one or more route plans
            (split by max stops per route: 15). Save to store the plans.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/routing/orders")}>
            Back
          </Button>
          <Button onClick={() => void save()} disabled={saving || loading || plans.length === 0}>
            {saving ? "Saving..." : "Save Route Plan(s)"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && <div className="text-sm text-muted-foreground">Optimizing...</div>}

      {!loading && plans.length === 0 && (
        <div className="text-sm text-muted-foreground">No route could be generated for these orders.</div>
      )}

      <div className="space-y-4">
        {plans.map((plan, idx) => (
          <OptimizedRoutePreview key={`${plan.driverId}-${idx}`} plan={plan} />
        ))}
      </div>
    </div>
  );
}

