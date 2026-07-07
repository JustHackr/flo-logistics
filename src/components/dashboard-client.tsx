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
import { RiskBadge } from "@/components/risk-badge";
import { formatNumber } from "@/lib/format";
import type { VehicleWithAnalysis } from "@/lib/types";

const RISK_COLORS = {
  high: "hsl(var(--destructive))",
  medium: "hsl(var(--chart-4))",
  low: "hsl(var(--chart-2))",
};

const ENGINE_COLORS = ["#3b82f6", "#f59e0b", "#10b981"];

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
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Fleet overview with Vehicle Quality Index and maintenance insights.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.totalVehicles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average VQI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{summary.avgVqi}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              High Risk
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
              Total Maint. Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatNumber(summary.totalMaintenanceCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>VQI Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.vqiDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicles by Engine Type</CardTitle>
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
            <CardTitle>Maintenance Cost by Vehicle Type</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={summary.costByVehicleType}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="vehicleType" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="totalCost" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Odometer vs Age (by Risk)</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age" name="Age (yr)" unit=" yr" />
                <YAxis dataKey="odometer" name="Odometer" unit=" km" />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value, name) => [
                    formatNumber(Number(value)),
                    name,
                  ]}
                />
                <Scatter
                  data={summary.scatterData}
                  fill="hsl(var(--primary))"
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
          <CardTitle>Vehicle Quality Index Table</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Select value={engineFilter} onValueChange={(v) => setEngineFilter(v ?? "all")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Engine" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All engines</SelectItem>
                <SelectItem value="gasoline">Gasoline</SelectItem>
                <SelectItem value="diesel">Diesel</SelectItem>
                <SelectItem value="ev">EV</SelectItem>
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? "all")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="car">Car</SelectItem>
                <SelectItem value="motorcycle">Motorcycle</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v ?? "all")}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risk</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
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
                    Name {sortKey === "name" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Engine</TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("odometerKm")}>
                    Odometer {sortKey === "odometerKm" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>
                  <button type="button" onClick={() => toggleSort("vqi")}>
                    VQI {sortKey === "vqi" && (sortDir === "asc" ? "↑" : "↓")}
                  </button>
                </TableHead>
                <TableHead>Recommended Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.name}</TableCell>
                  <TableCell className="capitalize">{v.vehicleType}</TableCell>
                  <TableCell className="uppercase">{v.engineType}</TableCell>
                  <TableCell>{formatNumber(v.odometerKm)} km</TableCell>
                  <TableCell>
                    <RiskBadge risk={v.riskLevel} vqi={v.vqi} />
                  </TableCell>
                  <TableCell className="max-w-xs text-sm text-muted-foreground">
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
