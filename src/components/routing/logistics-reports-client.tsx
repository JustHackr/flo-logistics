"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
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

type RouteSortKey = keyof RouteReportRow;
type DeliverySortKey = keyof DeliveryReportRow;

function formatDateTime(iso: string | null) {
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

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Logistics Operations Report
          </h2>
          <p className="text-muted-foreground">
            Generated {format(new Date(generatedAt), "PPpp")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" render={<Link href="/routing/dashboard" />}>
            Dashboard
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={exportSummaryCsv}>
            <Download className="mr-2 h-4 w-4" />
            Summary CSV
          </Button>
          <Button onClick={exportDeliveriesCsv}>
            <Download className="mr-2 h-4 w-4" />
            Deliveries CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Routes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.inProgressRoutes}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {routeCounts.planned} planned · {routeCounts.completed} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivery Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.deliveryProgressPercent}%</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {operations.deliveredStops}/{operations.totalDeliveryStops} stops
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg DTI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.avgDti ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {operations.deliveredOrdersWithDti} scored deliveries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg CFI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{operations.avgCfi ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {operations.totalEmissionsKg} kg CO₂e in progress
            </p>
          </CardContent>
        </Card>
      </div>

      <LogisticsChartsPanel charts={report.charts} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>Route Summary</CardTitle>
          <Button variant="outline" size="sm" onClick={exportRoutesCsv} className="print:hidden">
            <Download className="mr-2 h-4 w-4" />
            Export routes
          </Button>
        </CardHeader>
        <CardContent>
          {sortedRoutes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No route plans yet. Optimize orders from{" "}
              <Link href="/routing/orders" className="font-medium underline">
                Routing Orders
              </Link>
              .
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("driverName")}>
                      Driver {routeSortKey === "driverName" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("status")}>
                      Status {routeSortKey === "status" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("distanceKm")}>
                      Distance {routeSortKey === "distanceKm" && (routeSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleRouteSort("emissionsKg")}>
                      Emissions {routeSortKey === "emissionsKg" && (routeSortDir === "asc" ? "↑" : "↓")}
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
                  <TableHead>Vehicle</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRoutes.map((route) => (
                  <TableRow key={route.routePlanId}>
                    <TableCell className="font-medium">{route.driverName}</TableCell>
                    <TableCell>{route.status}</TableCell>
                    <TableCell>
                      {route.deliveredStops}/{route.totalStops} ({route.progressPercent}%)
                    </TableCell>
                    <TableCell>{route.distanceKm} km</TableCell>
                    <TableCell>{route.emissionsKg} kg</TableCell>
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
          <CardTitle>Stop-Level Delivery Report</CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDeliveries.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No delivery stops on route plans yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => toggleDeliverySort("driverName")}>
                      Driver {deliverySortKey === "driverName" && (deliverySortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>#</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planned ETA</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>
                    <button type="button" onClick={() => toggleDeliverySort("dtiScore")}>
                      DTI {deliverySortKey === "dtiScore" && (deliverySortDir === "asc" ? "↑" : "↓")}
                    </button>
                  </TableHead>
                  <TableHead>Slack (min)</TableHead>
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
                    <TableCell>{formatDateTime(row.plannedEtaAt)}</TableCell>
                    <TableCell>{formatDateTime(row.deliveredAt)}</TableCell>
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
