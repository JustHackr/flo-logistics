import type { RoutingPlanPreview, RoutingPlanStop } from "./plan-preview-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrencyShort } from "@/lib/format";

export function formatMinutes(totalMin: number) {
  if (!Number.isFinite(totalMin)) return "—";
  const hours = Math.floor(totalMin / 60);
  const minutes = Math.round(totalMin % 60);
  if (hours <= 0) return `${minutes} min`;
  return `${hours} h ${minutes} min`;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("id-ID", {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RoutePlanStopRow({ stop }: { stop: RoutingPlanStop }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">#{stop.sequence}</span>
          <span className="truncate text-sm">{stop.recipientAddress}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          ETA: {formatDateTime(stop.etaAt)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Leg: {stop.distanceKm} km, {formatMinutes(stop.durationMin)}
        </div>
      </div>
      <div className="text-right">
        <Badge variant="outline">{stop.distanceKm} km</Badge>
      </div>
    </div>
  );
}

export function OptimizedRoutePreview({
  plan,
}: {
  plan: RoutingPlanPreview;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">
              Driver vehicle route (Engine: {plan.vehicle.engineType.toUpperCase()})
            </CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              Vehicle type: <span className="font-medium">{plan.vehicle.vehicleType}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge risk={plan.vehicle.riskLevel} vqi={plan.vehicle.vqi} />
            <Badge variant="secondary">
              CO2 ~ {plan.estimatedEmissionsKg} kg
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Total distance</div>
            <div className="mt-1 text-lg font-bold">{plan.totalDistanceKm} km</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Estimated duration</div>
            <div className="mt-1 text-lg font-bold">{formatMinutes(plan.totalDurationMin)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">VQI health</div>
            <div className="mt-1 text-lg font-bold">{plan.vehicle.vqi}/100</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Sorted waypoints</div>
          <div className="space-y-2">
            {plan.stops.map((s) => (
              <RoutePlanStopRow key={s.orderId} stop={s} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

