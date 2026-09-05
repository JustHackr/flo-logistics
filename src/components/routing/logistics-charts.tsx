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
import { useI18n } from "@/components/i18n/use-i18n";

const PIE_COLORS = [
  "var(--primary)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
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
  const { t } = useI18n();
  const chartHeight = compact ? "h-56" : "h-72";
  const pipeline = charts.pipeline.map((item) => ({
    ...item,
    stage: t(`status.orderStatus.${String(item.stage).toUpperCase().replace(" ", "_")}`),
  }));
  const routeStatus = charts.routeStatus.map((item) => ({
    ...item,
    status: t(`status.routeStatus.${String(item.status).toLowerCase()}`),
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("routing.charts.pipeline.title")}</CardTitle>
          <CardDescription>{t("routing.charts.pipeline.description")}</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.pipeline.every((d) => d.count === 0) ? (
            <EmptyChart message={t("routing.charts.pipeline.empty")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("routing.charts.routeStatus.title")}</CardTitle>
          <CardDescription>{t("routing.charts.routeStatus.description")}</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.routeStatus.length === 0 ? (
            <EmptyChart message={t("routing.charts.routeStatus.empty")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={routeStatus}
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
          <CardTitle className="text-base">{t("routing.charts.driverVqi.title")}</CardTitle>
          <CardDescription>{t("routing.charts.driverVqi.description")}</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.driverVqi.length === 0 ? (
            <EmptyChart message={t("routing.charts.driverVqi.empty")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.driverVqi}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="vqi" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("routing.charts.dti.title")}</CardTitle>
          <CardDescription>{t("routing.charts.dti.description")}</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.dtiDistribution.every((d) => d.count === 0) ? (
            <EmptyChart message={t("routing.charts.dti.empty")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.dtiDistribution}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="range" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("routing.charts.performance.title")}</CardTitle>
          <CardDescription>{t("routing.charts.performance.description")}</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.routePerformance.length === 0 ? (
            <EmptyChart message={t("routing.charts.performance.empty")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.routePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="dti" name="DTI" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cfi" name="CFI" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("routing.charts.emissions.title")}</CardTitle>
          <CardDescription>{t("routing.charts.emissions.description")}</CardDescription>
        </CardHeader>
        <CardContent className={chartHeight}>
          {charts.emissionsByRoute.length === 0 ? (
            <EmptyChart message={t("routing.charts.emissions.empty")} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.emissionsByRoute}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} kg`, "CO₂e"]} />
                <Bar dataKey="emissionsKg" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {charts.engineCfi.length > 0 && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("routing.charts.engineCfi.title")}</CardTitle>
            <CardDescription>{t("routing.charts.engineCfi.description")}</CardDescription>
          </CardHeader>
          <CardContent className={compact ? "h-56" : "h-64"}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.engineCfi}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="engineType" />
                <YAxis domain={[0, 100]} />
                <Tooltip
                  formatter={(value, _name, item) => {
                    const payload = item?.payload as { routes?: number } | undefined;
                    return [
                      t("routing.charts.engineCfi.routes", {
                        value: String(value ?? ""),
                        count: payload?.routes ?? 0,
                      }),
                      t("routing.charts.engineCfi.average"),
                    ];
                  }}
                />
                <Bar dataKey="avgCfi" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
