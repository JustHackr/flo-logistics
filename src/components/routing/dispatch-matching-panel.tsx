"use client";

import Link from "next/link";
import type { DriverMatchingResult } from "@/lib/routing/driver-matching";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskBadge } from "@/components/risk-badge";
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
  if (!result || result.candidates.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No {title.toLowerCase()} drivers available.
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
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>VQI</TableHead>
              <TableHead className="w-20">Selected</TableHead>
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
                    <Badge>Yes</Badge>
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
    car: DriverMatchingResult | null;
    motorcycle: DriverMatchingResult | null;
  };
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Dispatch matching</CardTitle>
        <CardDescription>
          Drivers ranked by assigned vehicle VQI — highest score selected per
          vehicle type. Same driver may serve multiple route chunks.{" "}
          <Link href="/routing/drivers" className="font-medium text-primary hover:underline">
            Manage drivers
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <MatchingTable title="Car drivers" result={dispatchMatching.car} />
        <MatchingTable title="Motorcycle drivers" result={dispatchMatching.motorcycle} />
      </CardContent>
    </Card>
  );
}
