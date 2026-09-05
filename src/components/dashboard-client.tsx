"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CvSessionReportsPanel } from "@/components/computer-vision/cv-session-reports-panel";
import { RiskBadge } from "@/components/risk-badge";
import { formatCurrency, formatCurrencyShort, formatNumber } from "@/lib/format";
import { getVehicleFuelDisplay } from "@/lib/vehicle-fuel";
import type { VehicleWithAnalysis } from "@/lib/types";
import { useI18n } from "@/components/i18n/use-i18n";

const RISK_COLORS = {
  high: "var(--destructive)",
  medium: "var(--chart-4)",
  low: "var(--chart-2)",
};

const ENGINE_COLORS = ["#3b82f6", "#60a5fa", "#1d4ed8"];

type DashboardProps = {
  summary: {
    totalVehicles: number;
    avgVqi: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    totalMaintenanceCost: number;
    byEngineType: { engineType: string; count: number }[];
    byVehicleType: { vehicleType: string; count: number }[];
    vqiDistribution: { range: string; count: number }[];
    costByVehicleType: { vehicleType: string; totalCost: number }[];
    scatterData: {
      id: string;
      name: string;
      age: number;
      odometer: number;
      vqi: number;
      riskLevel: string;
    }[];
  };
  vehicles: VehicleWithAnalysis[];
};

export function DashboardClient({ summary, vehicles }: DashboardProps) {
  const { t, locale } = useI18n();
  const [engineFilter, setEngineFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<"name" | "vqi" | "odometerKm">("vqi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    return vehicles
      .filter((v) => engineFilter === "all" || v.engineType === engineFilter)
      .filter((v) => typeFilter === "all" || v.vehicleType === typeFilter)
      .filter((v) => riskFilter === "all" || v.riskLevel === riskFilter)
      .sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];
        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortDir === "asc" ? aVal - bVal : bVal - aVal;
        }
        return sortDir === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      });
  }, [vehicles, engineFilter, typeFilter, riskFilter, sortKey, sortDir]);

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("fleet.dashboard.title")}</h2>
        <p className="text-muted-foreground">{t("fleet.dashboard.subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fleet.dashboard.totalVehicles")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalVehicles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fleet.dashboard.averageVqi")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.avgVqi}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fleet.dashboard.highRisk")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {summary.highRiskCount}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("fleet.dashboard.totalMaintCost")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatCurrencyShort(summary.totalMaintenanceCost, locale)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("fleet.dashboard.vqiDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.vqiDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("fleet.dashboard.byEngineType")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={summary.byEngineType}
                  dataKey="count"
                  nameKey="engineType"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {summary.byEngineType.map((_, i) => (
                    <Cell key={i} fill={ENGINE_COLORS[i % ENGINE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("fleet.dashboard.costByVehicleType")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.costByVehicleType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicleType" />
                <YAxis
                  tickFormatter={(value) => formatCurrencyShort(Number(value), locale)}
                  width={80}
                />
                <Tooltip
                  formatter={(value) => [
                    formatCurrency(Number(value), locale),
                    t("fleet.dashboard.totalCost"),
                  ]}
                />
                <Bar dataKey="totalCost" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("fleet.dashboard.odometerVsAge")}</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="age"
                  name={t("fleet.dashboard.ageAxis")}
                  unit={` ${t("common.yearShort")}`}
                />
                <YAxis
                  dataKey="odometer"
                  name={t("fleet.dashboard.odometerAxis")}
                  unit=" km"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value, name) => [
                    formatNumber(Number(value), 0, locale),
                    name,
                  ]}
                />
                <Scatter
                  data={summary.scatterData}
                  fill="var(--primary)"
                >
                  {summary.scatterData.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={
                        RISK_COLORS[
                          entry.riskLevel as keyof typeof RISK_COLORS
                        ] ?? RISK_COLORS.low
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{t("fleet.dashboard.vqiTable")}</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={engineFilter} onValueChange={(v) => setEngineFilter(v ?? "all")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("fleet.dashboard.filterEngine")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("fleet.dashboard.allEngines")}</SelectItem>
                <SelectItem value="gasoline">{t("fleet.vehicles.engineGasoline")}</SelectItem>
                <SelectItem value="diesel">{t("fleet.vehicles.engineDiesel")}</SelectItem>
                <SelectItem value="ev">{t("fleet.vehicles.engineEv")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("fleet.dashboard.filterType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("fleet.dashboard.allTypes")}</SelectItem>
                <SelectItem value="van">{t("fleet.vehicles.typeVan")}</SelectItem>
                <SelectItem value="motorcycle">{t("fleet.vehicles.typeMotorcycle")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v ?? "all")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder={t("fleet.dashboard.filterRisk")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("fleet.dashboard.allRisk")}</SelectItem>
                <SelectItem value="high">{t("fleet.dashboard.riskHigh")}</SelectItem>
                <SelectItem value="medium">{t("fleet.dashboard.riskMedium")}</SelectItem>
                <SelectItem value="low">{t("fleet.dashboard.riskLow")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("name")}>
                    {t("common.name")} {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("common.fuel")}</TableHead>
                <TableHead>{t("fleet.vehicles.engine")}</TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("odometerKm")}>
                    {t("fleet.vehicles.odometer")}{" "}
                    {sortKey === "odometerKm" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("vqi")}>
                    VQI {sortKey === "vqi" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>{t("fleet.dashboard.recommendedAction")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => {
                const fuel = getVehicleFuelDisplay(v.vehicleType, v.engineType);
                return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="capitalize">{v.vehicleType}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        fuel.tier === "zero" && "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                        fuel.tier === "subsidized" && "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400"
                      )}
                    >
                      {fuel.shortLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="uppercase">{v.engineType}</TableCell>
                  <TableCell>
                    {t("common.kmValue", {
                      value: formatNumber(v.odometerKm, 0, locale),
                    })}
                  </TableCell>
                  <TableCell>
                    <RiskBadge risk={v.riskLevel} vqi={v.vqi} />
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
                    {v.recommendedAction}
                  </TableCell>
                </TableRow>
              );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CvSessionReportsPanel
        title={t("fleet.dashboard.cvTitle")}
        description={t("fleet.dashboard.cvDescription")}
      />
    </div>
  );
}
