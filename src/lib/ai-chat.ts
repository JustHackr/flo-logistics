import { prisma } from "@/lib/prisma";
import { getMasterOverview } from "@/lib/master-overview";
import { getRoutingLogisticsOverview } from "@/lib/routing-overview";
import { enrichVehicle, getFleetAvgMaintenanceCost } from "@/lib/vehicle-service";
import { formatCurrency, formatCurrencyShort, formatDate } from "@/lib/format";
import { startOfMonth, endOfMonth } from "date-fns";

export type ChatLink = {
  label: string;
  href: string;
};

export type ChatResponse = {
  reply: string;
  links?: ChatLink[];
};

type Intent =
  | "reports"
  | "active-drivers"
  | "orders-month"
  | "pipeline"
  | "maintenance"
  | "operations"
  | "fuel"
  | "high-risk"
  | "general";

function detectIntent(message: string): Intent {
  const text = message.toLowerCase();

  if (/report|summary|metric|kpi|delivery report/.test(text)) return "reports";
  if (/active driver|who.*driver|driver.*route|courier/.test(text)) return "active-drivers";
  if (/this month|sent.*month|orders.*month|monthly order/.test(text)) return "orders-month";
  if (/pipeline|received|preparing|on route|delivered|status/.test(text) && /order|delivery|pipeline/.test(text)) {
    if (!/maintenance|vehicle|fuel/.test(text)) return "pipeline";
  }
  if (/maintenance|vqi|risk|service due|upcoming/.test(text)) return /high.?risk/.test(text) ? "high-risk" : "maintenance";
  if (/fuel|pertamina|gas price|savings/.test(text)) return "fuel";
  if (/high.?risk|critical vehicle/.test(text)) return "high-risk";
  if (/today|update|operations|company|overview|what.?s happening/.test(text)) return "operations";

  return "general";
}

export async function respondToChatMessage(message: string): Promise<ChatResponse> {
  const intent = detectIntent(message);

  switch (intent) {
    case "reports":
      return buildReportsResponse();
    case "active-drivers":
      return buildActiveDriversResponse();
    case "orders-month":
      return buildOrdersMonthResponse();
    case "pipeline":
      return buildPipelineResponse();
    case "maintenance":
      return buildMaintenanceResponse();
    case "high-risk":
      return buildHighRiskResponse();
    case "fuel":
      return buildFuelResponse();
    case "operations":
      return buildOperationsResponse();
    default:
      return buildGeneralResponse();
  }
}

async function buildReportsResponse(): Promise<ChatResponse> {
  const logistics = await getRoutingLogisticsOverview();
  const { report, operations, routeCounts } = logistics;

  const lines = [
    "**Logistics reports summary**",
    "",
    `• Active routes: ${routeCounts.inProgress} in progress, ${routeCounts.planned} planned, ${routeCounts.completed} completed`,
    `• Delivery progress: ${operations.deliveryProgressPercent}% (${operations.deliveredStops}/${operations.totalDeliveryStops} stops)`,
    `• Distance (active): ${operations.totalDistanceKm} km · Duration: ${Math.floor(operations.totalDurationMin / 60)} h ${operations.totalDurationMin % 60} min`,
    `• Emissions (active): ${operations.totalEmissionsKg} kg CO₂e`,
    `• Avg DTI: ${operations.avgDti ?? "—"} · Avg CFI: ${operations.avgCfi ?? "—"}`,
    `• Fuel spend (active routes): ${formatCurrency(operations.totalFuelCostIdr)} · Savings ${formatCurrencyShort(operations.totalFuelCostSavingsIdr)} (${operations.totalFuelCostSavingsPercent}%)`,
    "",
    `Report bundle generated at ${formatDate(logistics.generatedAt)} with ${report.routes.length} route row(s) and ${report.deliveries.length} delivery row(s).`,
  ];

  return {
    reply: lines.join("\n"),
    links: [
      { label: "Logistics reports", href: "/routing/reports" },
      { label: "Maintenance reports", href: "/reports" },
    ],
  };
}

async function buildActiveDriversResponse(): Promise<ChatResponse> {
  const [drivers, logistics] = await Promise.all([
    prisma.driver.findMany({ include: { vehicle: true }, orderBy: { name: "asc" } }),
    getRoutingLogisticsOverview(),
  ]);

  const activeRoutes = logistics.activeRoutes.filter((r) => r.status === "IN_PROGRESS");
  const onRouteNames = new Set(activeRoutes.map((r) => r.driver.name));

  const lines = [
    "**Drivers & assignments**",
    "",
    `Total drivers: ${drivers.length} · On active routes: ${onRouteNames.size}`,
    "",
  ];

  for (const driver of drivers) {
    const route = activeRoutes.find((r) => r.driver.id === driver.id);
    if (route) {
      lines.push(
        `• **${driver.name}** (${driver.employeeId ?? "no ID"}) — **on route** · ${route.driver.vehicle.name} · ${route.totals.deliveredStops}/${route.totals.totalStops} stops delivered`
      );
    } else {
      lines.push(
        `• **${driver.name}** (${driver.employeeId ?? "no ID"}) — status: ${driver.status} · ${driver.vehicle.name}`
      );
    }
  }

  return {
    reply: lines.join("\n"),
    links: [
      { label: "Manage drivers", href: "/routing/drivers" },
      { label: "Logistics dashboard", href: "/routing/dashboard" },
    ],
  };
}

async function buildOrdersMonthResponse(): Promise<ChatResponse> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: monthStart, lte: monthEnd } },
    select: { status: true, createdAt: true },
  });

  const byStatus = {
    RECEIVED: 0,
    PREPARING: 0,
    ON_ROUTE: 0,
    DELIVERED: 0,
  };
  for (const order of orders) {
    byStatus[order.status]++;
  }

  const monthLabel = now.toLocaleString("id-ID", { month: "long", year: "numeric" });

  const lines = [
    `**Orders in ${monthLabel}**`,
    "",
    `Total created: **${orders.length}**`,
    `• Received: ${byStatus.RECEIVED}`,
    `• Preparing: ${byStatus.PREPARING}`,
    `• On route: ${byStatus.ON_ROUTE}`,
    `• Delivered: ${byStatus.DELIVERED}`,
  ];

  return {
    reply: lines.join("\n"),
    links: [{ label: "Routing orders", href: "/routing/orders" }],
  };
}

async function buildPipelineResponse(): Promise<ChatResponse> {
  const overview = await getMasterOverview();
  const { pipeline, totalOrders } = overview;

  const lines = [
    "**Order pipeline (company-wide)**",
    "",
    `• Received: ${pipeline.RECEIVED}`,
    `• Preparing: ${pipeline.PREPARING}`,
    `• On route: ${pipeline.ON_ROUTE}`,
    `• Delivered: ${pipeline.DELIVERED}`,
    "",
    `Total orders in system: ${totalOrders}`,
  ];

  return {
    reply: lines.join("\n"),
    links: [
      { label: "Overview", href: "/" },
      { label: "Orders", href: "/routing/orders" },
    ],
  };
}

async function buildMaintenanceResponse(): Promise<ChatResponse> {
  const overview = await getMasterOverview();
  const { fleetHealth, highRiskVehicles } = overview;

  const lines = [
    "**Fleet maintenance outlook**",
    "",
    `Fleet: ${fleetHealth.totalVehicles} vehicles · Avg VQI ${fleetHealth.avgVqi}/100`,
    `• High risk: ${fleetHealth.highRiskCount} · Medium: ${fleetHealth.mediumRiskCount} · Low: ${fleetHealth.lowRiskCount}`,
    `• Maintenance due in 90 days: ${fleetHealth.upcomingMaintenanceCount} vehicles (${formatCurrencyShort(fleetHealth.upcomingMaintenanceCost)} est.)`,
    "",
  ];

  if (highRiskVehicles.length > 0) {
    lines.push("**Attention vehicles:**");
    for (const v of highRiskVehicles.slice(0, 5)) {
      lines.push(
        `• ${v.name} — VQI ${v.vqi} · next maint. ${v.predictedNextMaintenance ? formatDate(v.predictedNextMaintenance) : "—"} · ${v.recommendedAction}`
      );
    }
  } else {
    lines.push("No high-risk vehicles flagged right now.");
  }

  return {
    reply: lines.join("\n"),
    links: [
      { label: "Vehicles", href: "/vehicles" },
      { label: "Maintenance dashboard", href: "/dashboard" },
    ],
  };
}

async function buildHighRiskResponse(): Promise<ChatResponse> {
  const vehicles = await prisma.vehicle.findMany();
  const fleetAvg = getFleetAvgMaintenanceCost(vehicles);
  const enriched = vehicles.map((v) => enrichVehicle(v, fleetAvg));
  const highRisk = enriched
    .filter((v) => v.riskLevel === "high")
    .sort((a, b) => a.vqi - b.vqi);

  const lines = [
    `**High-risk vehicles (VQI below 40): ${highRisk.length}**`,
    "",
  ];

  if (highRisk.length === 0) {
    lines.push("No vehicles currently in the high-risk band.");
  } else {
    for (const v of highRisk) {
      lines.push(
        `• **${v.name}** — VQI ${v.vqi}/100 · ${v.engineType.toUpperCase()} ${v.vehicleType} · ${v.recommendedAction}`
      );
    }
  }

  return {
    reply: lines.join("\n"),
    links: [{ label: "Fleet list", href: "/vehicles" }],
  };
}

async function buildFuelResponse(): Promise<ChatResponse> {
  const logistics = await getRoutingLogisticsOverview();
  const { fuelPrices, operations } = logistics;

  const lines = [
    "**Fuel prices & route savings**",
    "",
  ];

  if (fuelPrices) {
    lines.push(
      `Pertamina (${fuelPrices.region}) · effective ${fuelPrices.effectiveLabel ?? "—"} · fetched ${formatDate(fuelPrices.fetchedAt)}`,
      ""
    );
    for (const item of fuelPrices.items.slice(0, 6)) {
      lines.push(`• ${item.productName}: ${formatCurrency(item.pricePerLiter)}/${item.productCode === "electricity" ? "kWh" : "L"}`);
    }
    lines.push("");
  }

  lines.push(
    `Active routes fuel spend: ${formatCurrency(operations.totalFuelCostIdr)}`,
    `Optimized savings vs naive baseline: ${formatCurrencyShort(operations.totalFuelCostSavingsIdr)} (${operations.totalFuelCostSavingsPercent}%)`
  );

  return {
    reply: lines.join("\n"),
    links: [
      { label: "Gas price", href: "/system/gas-price" },
      { label: "Logistics dashboard", href: "/routing/dashboard" },
    ],
  };
}

async function buildOperationsResponse(): Promise<ChatResponse> {
  const overview = await getMasterOverview();
  const { operations, routeCounts, pipeline, attentionRoutes, fleetHealth } = overview;

  const lines = [
    "**Company operations snapshot**",
    "",
    `Routes: ${routeCounts.inProgress} active · ${routeCounts.planned} planned · ${routeCounts.completed} completed`,
    `Deliveries: ${operations.deliveryProgressPercent}% complete (${operations.deliveredStops}/${operations.totalDeliveryStops} stops)`,
    `Orders on route: ${operations.ordersOnRoute} · Pipeline: ${pipeline.RECEIVED} received / ${pipeline.PREPARING} preparing / ${pipeline.ON_ROUTE} on route / ${pipeline.DELIVERED} delivered`,
    `Fleet health: avg VQI ${fleetHealth.avgVqi} · ${fleetHealth.highRiskCount} high-risk vehicles`,
    "",
  ];

  if (attentionRoutes.length > 0) {
    lines.push("**Routes needing attention:**");
    for (const r of attentionRoutes.slice(0, 3)) {
      lines.push(
        `• ${r.driverName}: ${r.deliveredStops}/${r.totalStops} stops (${r.progressPercent}%)${r.nextStopAddress ? ` · next: ${r.nextStopAddress}` : ""}`
      );
    }
  }

  return {
    reply: lines.join("\n"),
    links: [
      { label: "Overview", href: "/" },
      { label: "Logistics dashboard", href: "/routing/dashboard" },
    ],
  };
}

async function buildGeneralResponse(): Promise<ChatResponse> {
  return {
    reply: [
      "I can answer questions about **BALON** using live data from your fleet, orders, and routes.",
      "",
      "Try one of the suggested prompts, for example:",
      "• Logistics reports summary",
      "• Active drivers and routes",
      "• Orders sent this month",
      "• Delivery pipeline status",
      "• Maintenance alerts or fuel prices",
    ].join("\n"),
    links: [{ label: "Overview dashboard", href: "/" }],
  };
}
