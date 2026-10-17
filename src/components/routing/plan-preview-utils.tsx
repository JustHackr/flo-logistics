"use client";

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
import { useI18n } from "@/components/i18n/use-i18n";
import type { TranslationParams } from "@/lib/i18n/t";

export function formatMinutes(
  totalMin: number,
  t: (key: string, params?: TranslationParams) => string
) {
  if (!Number.isFinite(totalMin)) return "—";
  const hours = Math.floor(totalMin / 60);
  const minutes = Math.round(totalMin % 60);
  if (hours <= 0) return t("common.durationMinutes", { minutes });
  return t("common.durationHoursMinutes", { hours, minutes });
}

function formatDateTime(
  iso: string | null | undefined,
  localeTag: string
) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(localeTag, {
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
  const { t, locale } = useI18n();
  const localeTag = locale === "id" ? "id-ID" : "en-US";

  if (waypoint.stopType === "warehouse") {
    const roleLabel =
      waypoint.role === "departure"
        ? t("routing.plan.depart")
        : t("routing.plan.return");
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
              ? t("routing.plan.departAt", {
                  time: formatDateTime(waypoint.etaAt, localeTag),
                })
              : t("routing.plan.returnEta", {
                  time: formatDateTime(waypoint.etaAt, localeTag),
                })}
            {waypoint.role === "return" && waypoint.distanceKm > 0
              ? t("routing.plan.legKm", {
                  km: waypoint.distanceKm,
                  duration: formatMinutes(waypoint.durationMin, t),
                })
              : ""}
          </div>
        </div>
        {waypoint.role === "return" && waypoint.distanceKm > 0 && (
          <div className="text-right">
            <Badge variant="outline">
              {t("common.kmValue", { value: waypoint.distanceKm })}
            </Badge>
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
          {t("routing.plan.eta", {
            time: formatDateTime(waypoint.etaAt, localeTag),
          })}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {t("routing.plan.leg", {
            km: waypoint.distanceKm,
            duration: formatMinutes(waypoint.durationMin, t),
          })}
          {waypoint.serviceTimeMin
            ? t("routing.plan.serviceExtra", {
                minutes: waypoint.serviceTimeMin,
              })
            : ""}
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
        <Badge variant="outline">
          {t("common.kmValue", { value: waypoint.distanceKm })}
        </Badge>
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
  const { t, locale } = useI18n();
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
              {plan.driver.employeeId ?? "—"} · {plan.driver.phone ?? t("common.noPhone")}
            </div>
            <div className="text-xs text-muted-foreground">
              {t("routing.dashboard.licenseStatus", {
                license: plan.driver.licenseNumber ?? "—",
              })}{" "}
              <span className="capitalize">{plan.driver.status}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RiskBadge risk={plan.vehicle.riskLevel} vqi={plan.vehicle.vqi} />
            <Badge variant="secondary">
              {t("routing.plan.emissionsBadge", {
                kg: plan.estimatedEmissionsKg,
              })}
            </Badge>
            {plan.fuelCostIdr != null && (
              <Badge variant="secondary">
                {t("routing.plan.fuelBadge", {
                  amount: formatCurrency(plan.fuelCostIdr, locale),
                })}
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
          <div className="text-sm font-semibold">{t("routing.plan.assignedVehicle")}</div>
          <div className="mt-1 text-sm">{plan.vehicle.name}</div>
          <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              {t("routing.plan.typeLabel")}{" "}
              <span className="font-medium text-foreground capitalize">{plan.vehicle.vehicleType}</span>
            </div>
            <div>
              {t("routing.plan.engineLabel")}{" "}
              <span className="font-medium text-foreground uppercase">{plan.vehicle.engineType}</span>
            </div>
            <div>
              {t("routing.plan.odometerLabel")}{" "}
              <span className="font-medium text-foreground">
                {t("common.kmValue", {
                  value: formatNumber(plan.vehicle.odometerKm, 0, locale),
                })}
              </span>
            </div>
            <div>
              {t("routing.plan.ageLabel")}{" "}
              <span className="font-medium text-foreground">
                {formatNumber(plan.vehicle.vehicleAgeYears, 1, locale)}{" "}
                {t("common.yearShort")}
              </span>
            </div>
            <div>
              {t("routing.plan.maintCostLabel")}{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(plan.vehicle.maintenanceCostUnit, locale)}
              </span>
            </div>
            <div>
              {t("routing.plan.vqiLabel")}{" "}
              <span className="font-medium text-foreground">{plan.vehicle.vqi}/100</span>
            </div>
          </div>
          {plan.vehicle.recommendedAction && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("routing.plan.maintenanceNote", {
                note: plan.vehicle.recommendedAction,
              })}
            </p>
          )}
        </div>

        {plan.conditionAssessment && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{t("routing.plan.conditionTitle")}</span>
              <Badge variant={plan.conditionAssessment.riskLevel === "CRITICAL" ? "destructive" : plan.conditionAssessment.riskLevel === "HIGH" ? "secondary" : "outline"}>
                {plan.conditionAssessment.riskLevel}
              </Badge>
              <span className="text-xs text-muted-foreground">{t("routing.plan.conditionSources")}</span>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
              <span>{t("routing.plan.trafficFactor", { factor: plan.conditionAssessment.trafficPenaltyFactor })}</span>
              <span>{t("routing.plan.weatherFactor", { factor: plan.conditionAssessment.weatherPenaltyFactor })}</span>
              <span>{t("routing.plan.incidentFactor", { factor: plan.conditionAssessment.incidentPenaltyFactor })}</span>
            </div>
            <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-muted-foreground">
              {plan.conditionAssessment.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{t("routing.plan.totalDistance")}</div>
            <div className="mt-1 text-lg font-bold">
              {t("common.kmValue", { value: plan.totalDistanceKm })}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">
              {t("routing.plan.estimatedDurationLabel")}
            </div>
            <div className="mt-1 text-lg font-bold">
              {formatMinutes(plan.totalDurationMin, t)}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {t("routing.plan.durationIncludes", {
                minutes: deliveryCount * 10,
              })}
            </div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{t("routing.plan.tripFuelCost")}</div>
            <div className="mt-1 text-lg font-bold">
              {plan.fuelCostIdr != null
                ? formatCurrency(plan.fuelCostIdr, locale)
                : "—"}
            </div>
            {plan.fuelProductName && (
              <div className="mt-1 text-xs text-muted-foreground">
                {plan.fuelProductName}
                {plan.fuelCostSavingsIdr != null
                  ? t("routing.plan.fuelSave", {
                      amount: formatCurrency(plan.fuelCostSavingsIdr, locale),
                      percent: plan.fuelCostSavingsPercent ?? 0,
                    })
                  : ""}
              </div>
            )}
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{t("routing.plan.vehicleVqi")}</div>
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
          <div className="text-sm font-semibold">{t("routing.plan.sortedWaypoints")}</div>
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
