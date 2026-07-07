"use client";

import { useMemo, useState } from "react";
import {
  TrendingDown,
  Wallet,
  CalendarClock,
  ShieldAlert,
  Gauge,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency, formatNumber } from "@/lib/format";
import {
  ENGINE_COST_MODIFIERS,
  ENGINE_ODOMETER_MODIFIERS,
  PLANNING_PENALTY_PER_DAY,
  RISK_THRESHOLDS,
  VQI_WEIGHTS,
} from "@/lib/vqi";
import type { VehicleWithAnalysis } from "@/lib/types";

const BENEFITS = [
  {
    icon: TrendingDown,
    title: "Reduce Downtime",
    body: "Spot high-risk vehicles before they break down, so fleets keep moving and deliveries stay on schedule.",
  },
  {
    icon: Wallet,
    title: "Optimize Maintenance Cost",
    body: "Prioritize spending on units that need it most instead of fixed, calendar-based servicing.",
  },
  {
    icon: CalendarClock,
    title: "Plan Ahead",
    body: "Predicted next-maintenance dates turn reactive repairs into scheduled, budgeted work.",
  },
  {
    icon: ShieldAlert,
    title: "Prioritize by Risk",
    body: "A single 0-100 score ranks the whole fleet, so limited workshop capacity goes where it matters.",
  },
];

const METRIC_ROWS = [
  {
    factor: "Vehicle Age",
    weight: VQI_WEIGHTS.age,
    measures: "How far through its expected life (in years) the vehicle is.",
    formula: "(age / lifetime years) × 30",
  },
  {
    factor: "Odometer Wear",
    weight: VQI_WEIGHTS.odometer,
    measures: "Distance travelled vs. expected lifetime distance, adjusted per engine type.",
    formula: "(odometer / expected km) × 30 × engine modifier",
  },
  {
    factor: "Maintenance Cost",
    weight: VQI_WEIGHTS.cost,
    measures: "This vehicle's cost relative to the fleet average, adjusted per engine type.",
    formula: "(cost × engine modifier / fleet avg) × 20",
  },
  {
    factor: "Maintenance Planning",
    weight: VQI_WEIGHTS.planning,
    measures: "How many days overdue the next scheduled maintenance is.",
    formula: "days overdue × 0.5",
  },
];

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function daysOverdue(nextMaintenance: string | null) {
  if (!nextMaintenance) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = new Date(nextMaintenance);
  next.setHours(0, 0, 0, 0);
  return Math.max(
    0,
    Math.floor((today.getTime() - next.getTime()) / (1000 * 60 * 60 * 24))
  );
}

export function MethodologyClient({
  vehicles,
  fleetAvgMaintenanceCost,
}: {
  vehicles: VehicleWithAnalysis[];
  fleetAvgMaintenanceCost: number;
}) {
  const [selectedId, setSelectedId] = useState(vehicles[0]?.id ?? "");
  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedId) ?? vehicles[0],
    [vehicles, selectedId]
  );

  const steps = useMemo(() => {
    if (!selected) return null;

    const odoModifier =
      ENGINE_ODOMETER_MODIFIERS[selected.engineType] ?? 1;
    const costModifier = ENGINE_COST_MODIFIERS[selected.engineType] ?? 1;
    const normalizedCost =
      fleetAvgMaintenanceCost > 0
        ? (selected.maintenanceCostUnit * costModifier) / fleetAvgMaintenanceCost
        : 1;
    const overdue = daysOverdue(selected.nextMaintenanceDate);

    return [
      {
        factor: "Vehicle Age",
        detail: `(${formatNumber(selected.vehicleAgeYears, 1)} yr ÷ ${formatNumber(
          selected.vehicleLifetimeYears,
          1
        )} yr) × ${VQI_WEIGHTS.age}`,
        raw: round1(
          (selected.vehicleAgeYears / selected.vehicleLifetimeYears) *
            VQI_WEIGHTS.age
        ),
        penalty: selected.penalties.age,
        max: VQI_WEIGHTS.age,
      },
      {
        factor: "Odometer Wear",
        detail: `(${formatNumber(selected.odometerKm)} ÷ ${formatNumber(
          selected.expectedLifetimeKm
        )}) × ${VQI_WEIGHTS.odometer} × ${odoModifier}`,
        raw: round1(
          (selected.odometerKm / selected.expectedLifetimeKm) *
            VQI_WEIGHTS.odometer *
            odoModifier
        ),
        penalty: selected.penalties.odometer,
        max: VQI_WEIGHTS.odometer,
      },
      {
        factor: "Maintenance Cost",
        detail: `(${formatCurrency(selected.maintenanceCostUnit)} × ${costModifier} ÷ ${formatCurrency(
          Math.round(fleetAvgMaintenanceCost)
        )}) × ${VQI_WEIGHTS.cost}`,
        raw: round1(normalizedCost * VQI_WEIGHTS.cost),
        penalty: selected.penalties.cost,
        max: VQI_WEIGHTS.cost,
      },
      {
        factor: "Maintenance Planning",
        detail:
          overdue > 0
            ? `${overdue} days overdue × ${PLANNING_PENALTY_PER_DAY}`
            : "Not overdue",
        raw: round1(overdue * PLANNING_PENALTY_PER_DAY),
        penalty: selected.penalties.planning,
        max: VQI_WEIGHTS.planning,
      },
    ];
  }, [selected, fleetAvgMaintenanceCost]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Metrics &amp; Methodology
        </h2>
        <p className="text-muted-foreground">
          How the Vehicle Quality Index (VQI) works and why it helps you manage a
          logistics fleet.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Why predictive maintenance?</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader className="pb-2">
                <benefit.icon className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{benefit.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">The VQI scoring matrix</h3>
        <p className="text-sm text-muted-foreground">
          Every vehicle starts at a perfect{" "}
          <span className="font-semibold text-foreground">100</span>. Four factors
          subtract penalty points. The remaining score is the VQI.
        </p>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factor</TableHead>
                  <TableHead className="w-24">Max Points</TableHead>
                  <TableHead>What it measures</TableHead>
                  <TableHead>Penalty formula</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRIC_ROWS.map((row) => (
                  <TableRow key={row.factor}>
                    <TableCell className="font-medium">{row.factor}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{row.weight} pts</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.measures}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {row.formula}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">The formula</CardTitle>
            <CardDescription>
              Each penalty is capped at its maximum before being subtracted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
{`VQI = 100 − (age + odometer + cost + planning)

max penalties: 30 + 30 + 20 + 20 = 100`}
            </pre>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="destructive">High risk</Badge>
                <span className="text-muted-foreground">
                  VQI &lt; {RISK_THRESHOLDS.highBelow}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Medium risk</Badge>
                <span className="text-muted-foreground">
                  {RISK_THRESHOLDS.highBelow} – {RISK_THRESHOLDS.lowAbove}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge>Low risk</Badge>
                <span className="text-muted-foreground">
                  VQI &gt; {RISK_THRESHOLDS.lowAbove}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Engine-type modifiers</CardTitle>
            <CardDescription>
              Different powertrains wear and cost differently.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engine</TableHead>
                  <TableHead>Odometer ×</TableHead>
                  <TableHead>Cost ×</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(["gasoline", "diesel", "ev"] as const).map((engine) => (
                  <TableRow key={engine}>
                    <TableCell className="font-medium uppercase">
                      {engine}
                    </TableCell>
                    <TableCell>{ENGINE_ODOMETER_MODIFIERS[engine]}</TableCell>
                    <TableCell>{ENGINE_COST_MODIFIERS[engine]}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              EVs have fewer wear parts (lower odometer penalty); diesel units
              trend slightly higher on both wear and cost.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Gauge className="h-5 w-5 text-primary" />
              Live calculation
            </h3>
            <p className="text-sm text-muted-foreground">
              Pick a vehicle to see exactly how its VQI is derived from real data.
            </p>
          </div>
          {selected && (
            <Select value={selectedId} onValueChange={(v) => setSelectedId(v ?? selectedId)}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vehicles.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selected && steps && (
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">{selected.name}</CardTitle>
                <RiskBadge risk={selected.riskLevel} vqi={selected.vqi} />
              </div>
              <CardDescription className="uppercase">
                {selected.vehicleType} · {selected.engineType} ·{" "}
                {formatNumber(selected.odometerKm)} km ·{" "}
                {formatNumber(selected.vehicleAgeYears, 1)} yr
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Factor</TableHead>
                    <TableHead>Calculation</TableHead>
                    <TableHead className="text-right">Raw</TableHead>
                    <TableHead className="text-right">Penalty (max)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {steps.map((step) => (
                    <TableRow key={step.factor}>
                      <TableCell className="font-medium">{step.factor}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {step.detail}
                      </TableCell>
                      <TableCell className="text-right">{step.raw}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-destructive">
                          −{step.penalty}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          / {step.max}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-medium">
                      Total penalties
                    </TableCell>
                    <TableCell className="text-right font-semibold text-destructive">
                      −{selected.penalties.total}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted p-4">
                <span className="font-mono text-sm">
                  VQI = 100 − {selected.penalties.total} ={" "}
                  <span className="text-lg font-bold text-foreground">
                    {selected.vqi}
                  </span>
                </span>
                <RiskBadge risk={selected.riskLevel} />
                <span className="text-sm text-muted-foreground">
                  Est. next service cost: {formatCurrency(selected.estimatedCost)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Recommended action:</span>{" "}
                {selected.recommendedAction}
              </p>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
