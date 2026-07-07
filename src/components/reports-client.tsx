"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Printer } from "lucide-react";
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
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatCurrencyShort, formatDate } from "@/lib/format";
import type { VehicleWithAnalysis } from "@/lib/types";

type ReportsClientProps = {
  generatedAt: string;
  vehicles: VehicleWithAnalysis[];
  timeline: {
    name: string;
    date: string | null;
    estimatedCost: number;
    riskLevel: string;
    inWindow: boolean;
  }[];
};

type SortKey =
  | "name"
  | "vqi"
  | "predictedNextMaintenance"
  | "estimatedCost"
  | "riskLevel";

export function ReportsClient({
  generatedAt,
  vehicles,
  timeline,
}: ReportsClientProps) {
  const [sortKey, setSortKey] = useState<SortKey>("vqi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    return [...vehicles].sort((a, b) => {
      let aVal: string | number = a[sortKey] as string | number;
      let bVal: string | number = b[sortKey] as string | number;
      if (sortKey === "predictedNextMaintenance") {
        aVal = a.predictedNextMaintenance
          ? new Date(a.predictedNextMaintenance).getTime()
          : 0;
        bVal = b.predictedNextMaintenance
          ? new Date(b.predictedNextMaintenance).getTime()
          : 0;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [vehicles, sortKey, sortDir]);

  const timelineChart = timeline
    .filter((t) => t.inWindow && t.date)
    .map((t) => ({
      name: t.name.length > 12 ? `${t.name.slice(0, 12)}…` : t.name,
      cost: t.estimatedCost,
      date: format(new Date(t.date!), "MMM d"),
    }));

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function exportCsv() {
    const headers = [
      "name",
      "vqi",
      "riskLevel",
      "predictedNextMaintenance",
      "estimatedCostIDR",
      "recommendedAction",
    ];
    const rows = sorted.map((v) =>
      [
        v.name,
        v.vqi,
        v.riskLevel,
        v.predictedNextMaintenance ?? "",
        v.estimatedCost,
        `"${v.recommendedAction.replace(/"/g, '""')}"`,
      ].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `predictive-maintenance-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Predictive Maintenance Report
          </h2>
          <p className="text-muted-foreground">
            Generated {format(new Date(generatedAt), "PPpp")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Maintenance (Next 90 Days)</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {timelineChart.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No maintenance events scheduled in the next 90 days.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis tickFormatter={(value) => formatCurrencyShort(Number(value))} width={80} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Est. cost"]}
                />
                <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Maintenance Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("name")}>
                    Vehicle {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("vqi")}>
                    VQI {sortKey === "vqi" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("riskLevel")}>
                    Risk {sortKey === "riskLevel" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("predictedNextMaintenance")}
                  >
                    Predicted Next{" "}
                    {sortKey === "predictedNextMaintenance" &&
                      (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("estimatedCost")}>
                    Est. Cost (Rp){" "}
                    {sortKey === "estimatedCost" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell>{v.vqi}</TableCell>
                  <TableCell>
                    <RiskBadge risk={v.riskLevel} />
                  </TableCell>
                  <TableCell>{formatDate(v.predictedNextMaintenance)}</TableCell>
                  <TableCell>{formatCurrency(v.estimatedCost)}</TableCell>
                  <TableCell className="max-w-md text-sm text-muted-foreground">
                    {v.recommendedAction}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
