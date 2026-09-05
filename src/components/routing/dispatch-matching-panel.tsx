"use client";

import Link from "next/link";
import type { DriverMatchingResult } from "@/lib/routing/driver-matching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";
import { useI18n } from "@/components/i18n/use-i18n";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function MatchingTable({
  title,
  result,
}: {
  title: string;
  result: DriverMatchingResult | null;
}) {
  const { t } = useI18n();
  if (!result || result.candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        {t("routing.dispatch.noDrivers", { type: title.toLowerCase() })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-muted-foreground">{result.selectionReason}</div>
      <div className="overflow-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t("routing.dispatch.rank")}</TableHead>
              <TableHead>{t("routing.dispatch.driver")}</TableHead>
              <TableHead>{t("routing.dispatch.vehicle")}</TableHead>
              <TableHead>VQI</TableHead>
              <TableHead className="w-20">{t("routing.dispatch.selected")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.candidates.map((c) => (
              <TableRow
                key={c.driverId}
                className={c.rank === 1 ? "bg-primary/5" : undefined}
              >
                <TableCell>{c.rank}</TableCell>
                <TableCell>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.employeeId ?? "—"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{c.vehicleName}</div>
                  <div className="text-xs capitalize text-muted-foreground">
                    {c.vehicleType} · {c.engineType}
                  </div>
                </TableCell>
                <TableCell>
                  <RiskBadge risk={c.riskLevel} vqi={c.vqi} />
                </TableCell>
                <TableCell>
                  {c.rank === 1 ? (
                    <Badge>{t("common.yes")}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function DispatchMatchingPanel({
  dispatchMatching,
}: {
  dispatchMatching: {
    van: DriverMatchingResult | null;
    motorcycle: DriverMatchingResult | null;
  };
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("routing.dispatch.title")}</CardTitle>
        <CardDescription>
          {t("routing.dispatch.description")}{" "}
          <Link href="/routing/drivers" className="font-medium text-primary hover:underline">
            {t("routing.drivers.manage")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <MatchingTable title={t("routing.dispatch.vanDrivers")} result={dispatchMatching.van} />
        <MatchingTable title={t("routing.dispatch.motorcycleDrivers")} result={dispatchMatching.motorcycle} />
      </CardContent>
    </Card>
  );
}
