"use client";

import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency, formatCurrencyShort } from "@/lib/format";
import type { ActiveRouteSummary } from "@/lib/routing-overview";
import {
  buildRouteDistanceHelp,
  buildRouteDurationHelp,
  buildRouteEmissionsHelp,
  buildRouteFuelCostHelp,
} from "@/lib/routing/route-metric-help";

function RouteMetricBox({
  label,
  value,
  subtext,
  helpText,
}: {
  label: string;
  value: ReactNode;
  subtext?: ReactNode;
  helpText: string;
}) {
  const box = (
    <div className="rounded-lg border p-3 transition-colors hover:bg-muted/40">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value}</div>
      {subtext && (
        <div className="mt-1 text-xs text-muted-foreground">{subtext}</div>
      )}
    </div>
  );

  return (
    <Tooltip>
      <TooltipTrigger
        className="block w-full cursor-help rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        delay={200}
      >
        {box}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className="max-w-sm whitespace-normal px-3 py-2 text-left leading-relaxed"
      >
        {helpText}
      </TooltipContent>
    </Tooltip>
  );
}

export function RouteTotalsMetricGrid({ route }: { route: ActiveRouteSummary }) {
  const hours = Math.floor(route.totals.totalDurationMin / 60);
  const minutes = Math.round(route.totals.totalDurationMin % 60);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <RouteMetricBox
        label="Distance"
        value={`${route.totals.totalDistanceKm} km`}
        helpText={buildRouteDistanceHelp(route)}
      />
      <RouteMetricBox
        label="Duration"
        value={
          <>
            {hours} h {minutes} min
          </>
        }
        helpText={buildRouteDurationHelp(route)}
      />
      <RouteMetricBox
        label="Emissions"
        value={`${route.totals.estimatedEmissionsKg} kg CO₂e`}
        helpText={buildRouteEmissionsHelp(route)}
      />
      <RouteMetricBox
        label="Fuel cost"
        value={formatCurrency(route.totals.fuelCostIdr)}
        subtext={
          <>
            {route.totals.fuelProductName} · save{" "}
            {formatCurrencyShort(route.totals.fuelCostSavingsIdr)} (
            {route.totals.fuelCostSavingsPercent}%)
          </>
        }
        helpText={buildRouteFuelCostHelp(route)}
      />
    </div>
  );
}
