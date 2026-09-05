"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import { Download, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogisticsChartsPanel } from "@/components/routing/logistics-charts";
import type {
  DeliveryReportRow,
  RouteReportRow,
} from "@/lib/routing-reports";
import type { RoutingLogisticsOverview } from "@/lib/routing-overview";
import { useI18n } from "@/components/i18n/use-i18n";
import { toIntlLocale, type Locale } from "@/lib/i18n/config";

type RouteSortKey = keyof RouteReportRow;
type DeliverySortKey = keyof DeliveryReportRow;

function formatDateTime(iso: string | null, locale: Locale) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(toIntlLocale(locale), {
    hour12: false,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function csvEscape(value: string | number | null | undefined) {
  if (value == null) return "";
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function LogisticsReportsClient({
  overview,
}: {
  overview: RoutingLogisticsOverview;
}) {
  const { t, locale } = useI18n();
  const { report, operations, routeCounts, generatedAt } = overview;
  const [routeSortKey, setRouteSortKey] = useState<RouteSortKey>("driverName");
  const [routeSortDir, setRouteSortDir] = useState<"asc" | "desc">("asc");
  const [deliverySortKey, setDeliverySortKey] =
    useState<DeliverySortKey>("driverName");
  const [deliverySortDir, setDeliverySortDir] = useState<"asc" | "desc">("asc");

  const sortedRoutes = useMemo(() => {
    return [...report.routes].sort((a, b) => {
      const aVal = a[routeSortKey];
      const bVal = b[routeSortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return routeSortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return routeSortDir === "asc"
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });
  }, [report.routes, routeSortKey, routeSortDir]);

  const sortedDeliveries = useMemo(() => {
    return [...report.deliveries].sort((a, b) => {
      const aVal = a[deliverySortKey];
      const bVal = b[deliverySortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return deliverySortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return deliverySortDir === "asc"
        ? String(aVal ?? "").localeCompare(String(bVal ?? ""))
        : String(bVal ?? "").localeCompare(String(aVal ?? ""));
    });
  }, [report.deliveries, deliverySortKey, deliverySortDir]);

  function toggleRouteSort(key: RouteSortKey) {
    if (routeSortKey === key) setRouteSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setRouteSortKey(key);
      setRouteSortDir("asc");
    }
  }

  function toggleDeliverySort(key: DeliverySortKey) {
    if (deliverySortKey === key) {
      setDeliverySortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setDeliverySortKey(key);
      setDeliverySortDir("asc");
    }
  }

  function downloadCsv(filename: string, headers: string[], rows: string[][]) {
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportRoutesCsv() {
    downloadCsv(
      `logistics-routes-${format(new Date(), "yyyy-MM-dd")}.csv`,
      [
        "driverName",
        "status",
        "warehouse",
        "totalStops",
        "deliveredStops",
        "progressPercent",
        "distanceKm",
        "durationMin",
        "emissionsKg",
        "avgDti",
        "routeCfi",
        "engineType",
        "vehicleType",
        "vehicleName",
      ],
      sortedRoutes.map((r) => [
        csvEscape(r.driverName),
        csvEscape(r.status),
        csvEscape(r.warehouse),
        String(r.totalStops),
        String(r.deliveredStops),
        String(r.progressPercent),
        String(r.distanceKm),
        String(r.durationMin),
        String(r.emissionsKg),
        csvEscape(r.avgDti),
        String(r.routeCfi),
        csvEscape(r.engineType),
        csvEscape(r.vehicleType),
        csvEscape(r.vehicleName),
      ])
    );
  }

  function exportDeliveriesCsv() {
    downloadCsv(
      `logistics-deliveries-${format(new Date(), "yyyy-MM-dd")}.csv`,
      [
        "driverName",
        "sequence",
        "recipientAddress",
        "orderStatus",
        "receivedAt",
        "plannedEtaAt",
        "deliveredAt",
        "dtiScore",
        "slackMin",
        "cfiScore",
        "distanceKm",
        "routeStatus",
      ],
      sortedDeliveries.map((d) => [
        csvEscape(d.driverName),
        String(d.sequence),
        csvEscape(d.recipientAddress),
        csvEscape(d.orderStatus),
        csvEscape(d.receivedAt),
        csvEscape(d.plannedEtaAt),
        csvEscape(d.deliveredAt),
        csvEscape(d.dtiScore),
        csvEscape(d.slackMin),
        String(d.cfiScore),
        String(d.distanceKm),
        csvEscape(d.routeStatus),
      ])
    );
  }

  function exportSummaryCsv() {
    downloadCsv(
      `logistics-summary-${format(new Date(), "yyyy-MM-dd")}.csv`,
      ["metric", "value"],
      [
        ["generatedAt", csvEscape(generatedAt)],
        ["activeRoutes", String(operations.inProgressRoutes)],
        ["plannedRoutes", String(routeCounts.planned)],
        ["completedRoutes", String(routeCounts.completed)],
        ["deliveryProgressPercent", String(operations.deliveryProgressPercent)],
        ["totalDistanceKm", String(operations.totalDistanceKm)],
        ["totalEmissionsKg", String(operations.totalEmissionsKg)],
        ["avgDti", csvEscape(operations.avgDti)],
        ["avgCfi", csvEscape(operations.avgCfi)],
        ["deliveredOrdersWithDti", String(operations.deliveredOrdersWithDti)],
      ]
    );
  }

  const dateFnsLoc = locale === "id" ? idLocale : enUS;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("routing.reports.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("common.generatedAt", {
              time: format(new Date(generatedAt), "PPpp", { locale: dateFnsLoc }),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/routing/dashboard" />}>
            {t("routing.reports.dashboard")}
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            {t("common.print")}
          </Button>
          <Button variant="outline" onClick={exportSummaryCsv}>
            <Download className="mr-2 h-4 w-4" />
            {t("routing.reports.summaryCsv")}
          </Button>
          <Button onClick={exportDeliveriesCsv}>
            <Download className="mr-2 h-4 w-4" />
            {t("routing.reports.deliveriesCsv")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("routing.reports.activeRoutes")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.inProgressRoutes}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("routing.reports.routeCounts", {
                planned: routeCounts.planned,
                completed: routeCounts.completed,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("routing.reports.deliveryProgress")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.deliveryProgressPercent}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("routing.reports.stopsDetail", {
                delivered: operations.deliveredStops,
                total: operations.totalDeliveryStops,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("routing.reports.avgDti")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.avgDti ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("routing.reports.scoredDeliveries", {
                count: operations.deliveredOrdersWithDti,
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("routing.reports.avgCfi")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.avgCfi ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("routing.reports.emissionsInProgress", {
                kg: operations.totalEmissionsKg,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <LogisticsChartsPanel charts={report.charts} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("routing.reports.routeSummary")}</CardTitle>
          <Button variant="outline" size="sm" onClick={exportRoutesCsv} className="print:hidden">
            <Download className="mr-2 h-4 w-4" />
            {t("routing.reports.exportRoutes")}
          </Button>
        </CardHeader>
        <CardContent>
          {sortedRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("routing.reports.noRoutes", {
                orders: t("routing.reports.ordersLink"),
              })}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("driverName")}>
                      {t("routing.reports.driver")}{" "}
                      {routeSortKey === "driverName" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("status")}>
                      {t("common.status")}{" "}
                      {routeSortKey === "status" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>{t("routing.reports.progress")}</TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("distanceKm")}>
                      {t("routing.reports.distanceCol")}{" "}
                      {routeSortKey === "distanceKm" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("emissionsKg")}>
                      {t("routing.reports.emissions")}{" "}
                      {routeSortKey === "emissionsKg" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("avgDti")}>
                      DTI {routeSortKey === "avgDti" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("routeCfi")}>
                      CFI {routeSortKey === "routeCfi" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>{t("common.vehicle")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRoutes.map((route) => (
                  <TableRow key={route.routePlanId}>
                    <TableCell className="font-medium">{route.driverName}</TableCell>
                    <TableCell>{route.status}</TableCell>
                    <TableCell>
                      {t("routing.reports.progressCell", {
                        delivered: route.deliveredStops,
                        total: route.totalStops,
                        percent: route.progressPercent,
                      })}
                    </TableCell>
                    <TableCell>{t("common.kmValue", { value: route.distanceKm })}</TableCell>
                    <TableCell>{t("common.kgValue", { value: route.emissionsKg })}</TableCell>
                    <TableCell>{route.avgDti ?? "—"}</TableCell>
                    <TableCell>{route.routeCfi}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {route.vehicleName} · {route.engineType}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("routing.reports.stopLevelTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("routing.reports.noDeliveries")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => toggleDeliverySort("driverName")}>
                      {t("routing.reports.driver")}{" "}
                      {deliverySortKey === "driverName" &&
                        (deliverySortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>{t("routing.reports.address")}</TableHead>
                  <TableHead>{t("common.status")}</TableHead>
                  <TableHead>{t("routing.reports.plannedEta")}</TableHead>
                  <TableHead>{t("routing.reports.delivered")}</TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleDeliverySort("dtiScore")}>
                      DTI {deliverySortKey === "dtiScore" && (deliverySortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>{t("routing.reports.slackMin")}</TableHead>
                  <TableHead>CFI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDeliveries.map((row) => (
                  <TableRow key={`${row.routePlanId}-${row.orderId}`}>
                    <TableCell className="font-medium">{row.driverName}</TableCell>
                    <TableCell>{row.sequence}</TableCell>
                    <TableCell className="max-w-xs truncate">{row.recipientAddress}</TableCell>
                    <TableCell className="capitalize">{row.orderStatus.toLowerCase().replace("_", " ")}</TableCell>
                    <TableCell>{formatDateTime(row.plannedEtaAt, locale)}</TableCell>
                    <TableCell>{formatDateTime(row.deliveredAt, locale)}</TableCell>
                    <TableCell>{row.dtiScore ?? "—"}</TableCell>
                    <TableCell>{row.slackMin ?? "—"}</TableCell>
                    <TableCell>{row.cfiScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
