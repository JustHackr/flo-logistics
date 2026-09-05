"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
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
import { useI18n } from "@/components/i18n/use-i18n";

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
  const { t, locale } = useI18n();
  const [sortKey, setSortKey] = useState<SortKey>("vqi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const dateFnsLoc = locale === "id" ? idLocale : enUS;

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
    .filter((tItem) => tItem.inWindow && tItem.date)
    .map((tItem) => ({
      name: tItem.name.length > 12 ? `${tItem.name.slice(0, 12)}…` : tItem.name,
      cost: tItem.estimatedCost,
      date: format(new Date(tItem.date!), "MMM d", { locale: dateFnsLoc }),
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
            {t("fleet.reports.title")}
          </h2>
          <p className="text-muted-foreground">
            {t("common.generatedAt", {
              time: format(new Date(generatedAt), "PPpp", { locale: dateFnsLoc }),
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            {t("common.print")}
          </Button>
          <Button onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            {t("common.exportCsv")}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("fleet.reports.upcomingTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {timelineChart.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("fleet.reports.noUpcoming")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timelineChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis
                  tickFormatter={(value) => formatCurrencyShort(Number(value), locale)}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value), locale),
                    t("fleet.reports.estCost"),
                  ]}
                />
                <Bar dataKey="cost" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("fleet.reports.forecastTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("name")}>
                    {t("common.vehicle")}{" "}
                    {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("vqi")}>
                    VQI {sortKey === "vqi" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("riskLevel")}>
                    {t("common.risk")}{" "}
                    {sortKey === "riskLevel" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => toggleSort("predictedNextMaintenance")}
                  >
                    {t("fleet.reports.predictedNext")}{" "}
                    {sortKey === "predictedNextMaintenance" &&
                      (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("estimatedCost")}>
                    {t("fleet.reports.estCostRp")}{" "}
                    {sortKey === "estimatedCost" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>{t("fleet.reports.recommendedAction")}</TableHead>
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
                  <TableCell>{formatDate(v.predictedNextMaintenance, locale)}</TableCell>
                  <TableCell>{formatCurrency(v.estimatedCost, locale)}</TableCell>
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
