"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LogisticsCharts } from "@/lib/routing-reports";

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

function EmptyChart({ message }: { message: string }) {
  return (
    <p className="flex h-full items-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}

export function LogisticsChartsPanel({
  charts,
  compact = false,
}: {
  charts: LogisticsCharts;
  compact?: boolean;
}) {
  const chartHeight = compact ? "h-56" : "h-72";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Pipeline</CardTitle>
          <CardDescription>Orders by fulfillment stage</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.pipeline.every((d) => d.count === 0) ? (
            <EmptyChart message="No orders in the pipeline yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.pipeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route Status</CardTitle>
          <CardDescription>Planned, active, and completed routes</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.routeStatus.length === 0 ? (
            <EmptyChart message="No route plans created yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.routeStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={compact ? 72 : 96}
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {charts.routeStatus.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Driver VQI</CardTitle>
          <CardDescription>Vehicle quality index by assigned driver</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.driverVqi.length === 0 ? (
            <EmptyChart message="No drivers in roster." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.driverVqi}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="vqi" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">DTI Distribution</CardTitle>
          <CardDescription>Delivered stops scored by SLA performance</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.dtiDistribution.every((d) => d.count === 0) ? (
            <EmptyChart message="No delivered stops with DTI scores yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.dtiDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route DTI & CFI</CardTitle>
          <CardDescription>Delivery performance and carbon index per route</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.routePerformance.length === 0 ? (
            <EmptyChart message="Optimize orders to create route plans." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.routePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="dti" name="DTI" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cfi" name="CFI" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Route Emissions</CardTitle>
          <CardDescription>Estimated CO₂e by active route (kg)</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.emissionsByRoute.length === 0 ? (
            <EmptyChart message="No route emissions data yet." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.emissionsByRoute}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} kg`, "CO₂e"]} />
                <Bar dataKey="emissionsKg" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {charts.engineCfi.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">CFI by Engine Type</CardTitle>
            <CardDescription>Average carbon footprint index across routes</CardDescription>
          </CardHeader>
          <CardContent className={compact ? "h-56" : "h-64"}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.engineCfi}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="engineType" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value, _name, item) => [
                    `${value} (${(item.payload as { routes: number }).routes} routes)`,
                    "Avg CFI",
                  ]}
                />
                <Bar dataKey="avgCfi" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
