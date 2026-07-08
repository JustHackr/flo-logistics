import type { ReactNode } from "react";
import type { RouteWaypoint } from "@/lib/routing/waypoints";
import type { RoutingPlanPreview } from "./plan-preview-client";
import { describeTrafficSource } from "@/lib/routing/estimator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatNumber } from "@/lib/format";
import { Warehouse } from "lucide-react";
import { RouteMapView } from "./route-map-view";
import { DtiBadge } from "@/components/dti-badge";
import { CfiBadge } from "@/components/cfi-badge";

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

export function RouteWaypointRow({
  waypoint,
  action,
}: {
  waypoint: RouteWaypoint;
  action?: ReactNode;
}) {
  if (waypoint.stopType === "warehouse") {
    const roleLabel = waypoint.role === "departure" ? "Depart" : "Return";
    return (
      <div className="flex items-start justify-between gap-3 rounded-md border border-dashed bg-muted/30 p-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-sm font-semibold">#{waypoint.sequence}</span>
            <span className="truncate text-sm font-medium">{waypoint.name}</span>
            <Badge variant="outline">{roleLabel}</Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {waypoint.address}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {waypoint.role === "departure"
              ? `Depart: ${formatDateTime(waypoint.etaAt)}`
              : `Return ETA: ${formatDateTime(waypoint.etaAt)}`}
            {waypoint.role === "return" && waypoint.distanceKm > 0
              ? ` · Leg: ${waypoint.distanceKm} km drive, ${formatMinutes(waypoint.durationMin)}`
              : ""}
          </div>
        </div>
        {waypoint.role === "return" && waypoint.distanceKm > 0 && (
          <div className="text-right">
            <Badge variant="outline">{waypoint.distanceKm} km</Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-md border p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">#{waypoint.sequence}</span>
          <span className="truncate text-sm">{waypoint.recipientAddress}</span>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          ETA: {formatDateTime(waypoint.etaAt)}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Leg: {waypoint.distanceKm} km drive, {formatMinutes(waypoint.durationMin)}
          {waypoint.serviceTimeMin ? ` + ${waypoint.serviceTimeMin} min service` : ""}
        </div>
        {(waypoint.dtiPending || waypoint.dtiScore != null || waypoint.cfiScore != null) && (
          <div className="mt-2 flex flex-wrap gap-2">
            {waypoint.dtiPending ? (
              <DtiBadge pending />
            ) : waypoint.dtiScore != null ? (
              <DtiBadge score={waypoint.dtiScore} risk={waypoint.dtiRisk} />
            ) : null}
            {waypoint.cfiScore != null && <CfiBadge score={waypoint.cfiScore} />}
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-2">
        <Badge variant="outline">{waypoint.distanceKm} km</Badge>
        {action}
      </div>
    </div>
  );
}

export function OptimizedRoutePreview({
  plan,
}: {
  plan: RoutingPlanPreview;
}) {
  const deliveryCount = plan.stops.length;
  const waypoints = plan.waypoints ?? [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base">
              {plan.driver.name}
            </CardTitle>
            {plan.matching && (
              <p className="text-xs text-muted-foreground">
                {plan.matching.selectionReason}
              </p>
            )}
            <div className="text-sm text-muted-foreground">
              {plan.driver.employeeId ?? "—"} · {plan.driver.phone ?? "No phone"}
            </div>
            <div className="text-xs text-muted-foreground">
              License: {plan.driver.licenseNumber ?? "—"} · Status:{" "}
              <span className="capitalize">{plan.driver.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge risk={plan.vehicle.riskLevel} vqi={plan.vehicle.vqi} />
            <Badge variant="secondary">
              CO₂ ~ {plan.estimatedEmissionsKg} kg
            </Badge>
            {plan.fuelCostIdr != null && (
              <Badge variant="secondary">
                Fuel {formatCurrency(plan.fuelCostIdr)}
              </Badge>
            )}
            {plan.trafficSource && (
              <Badge variant="outline">
                {describeTrafficSource(plan.trafficSource)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border p-3">
          <div className="text-sm font-semibold">Assigned vehicle</div>
          <div className="mt-1 text-sm">{plan.vehicle.name}</div>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              Type: <span className="font-medium text-foreground capitalize">{plan.vehicle.vehicleType}</span>
            </div>
            <div>
              Engine: <span className="font-medium text-foreground uppercase">{plan.vehicle.engineType}</span>
            </div>
            <div>
              Odometer: <span className="font-medium text-foreground">{formatNumber(plan.vehicle.odometerKm)} km</span>
            </div>
            <div>
              Age: <span className="font-medium text-foreground">{formatNumber(plan.vehicle.vehicleAgeYears, 1)} yr</span>
            </div>
            <div>
              Maint. cost: <span className="font-medium text-foreground">{formatCurrency(plan.vehicle.maintenanceCostUnit)}</span>
            </div>
            <div>
              VQI: <span className="font-medium text-foreground">{plan.vehicle.vqi}/100</span>
            </div>
          </div>
          {plan.vehicle.recommendedAction && (
            <p className="mt-2 text-xs text-muted-foreground">
              Maintenance note: {plan.vehicle.recommendedAction}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Total distance</div>
            <div className="mt-1 text-lg font-bold">{plan.totalDistanceKm} km</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Estimated duration</div>
            <div className="mt-1 text-lg font-bold">{formatMinutes(plan.totalDurationMin)}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Includes Jakarta traffic + ~{deliveryCount * 10} min stop service
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Trip fuel cost</div>
            <div className="mt-1 text-lg font-bold">
              {plan.fuelCostIdr != null ? formatCurrency(plan.fuelCostIdr) : "—"}
            </div>
            {plan.fuelProductName && (
              <div className="mt-1 text-xs text-muted-foreground">
                {plan.fuelProductName}
                {plan.fuelCostSavingsIdr != null
                  ? ` · save ${formatCurrency(plan.fuelCostSavingsIdr)} (${plan.fuelCostSavingsPercent ?? 0}%)`
                  : ""}
              </div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Vehicle VQI</div>
            <div className="mt-1 text-lg font-bold">{plan.vehicle.vqi}/100</div>
          </div>
        </div>

        {waypoints.length > 0 && (
          <RouteMapView
            waypoints={waypoints}
            encodedPolyline={plan.encodedPolyline}
            className="h-72"
          />
        )}

        <div className="space-y-2">
          <div className="text-sm font-semibold">Sorted waypoints</div>
          <div className="space-y-2">
            {waypoints.length > 0
              ? waypoints.map((wp) => (
                  <RouteWaypointRow
                    key={`${wp.stopType}-${wp.sequence}-${wp.stopType === "delivery" ? wp.orderId : wp.role}`}
                    waypoint={wp}
                  />
                ))
              : plan.stops.map((s) => (
                  <RouteWaypointRow
                    key={s.orderId}
                    waypoint={{
                      stopType: "delivery",
                      sequence: s.sequence,
                      orderId: s.orderId,
                      recipientAddress: s.recipientAddress,
                      lat: s.lat ?? 0,
                      lng: s.lng ?? 0,
                      etaAt: s.etaAt,
                      distanceKm: s.distanceKm,
                      durationMin: s.durationMin,
                      serviceTimeMin: s.serviceTimeMin,
                    }}
                  />
                ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
