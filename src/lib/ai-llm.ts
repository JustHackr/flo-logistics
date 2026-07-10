import { getMasterOverview } from "@/lib/master-overview";
import { getRoutingLogisticsOverview } from "@/lib/routing-overview";
import { formatCurrencyShort } from "@/lib/format";
import type { AiProviderSettings } from "@/lib/ai-settings";

export type LlmChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const LOGISTICS_EXPERT_SYSTEM = `You are the BALON Supply Chain Operations Assistant — a senior logistics, fleet, and last-mile delivery expert for Blibli's Jakarta operations (BALON: Blibli Analytic Logistic Optimization & Maintenance).

YOUR ROLE:
- Help operators understand delivery performance, routes, drivers, orders, fleet health (VQI), maintenance, fuel costs, emissions, DTI/CFI metrics, and warehouse logistics.
- Answer using the LIVE COMPANY DATA block when numbers are requested. Never invent metrics not present in that data.
- Be concise, professional, and action-oriented (ops desk tone).

STRICT SCOPE — logistics & supply chain only:
- In scope: orders, routes, drivers, vehicles, maintenance, fuel, emissions, KPIs, reports, Jakarta delivery ops, fleet optimization.
- Out of scope: recipes, entertainment, coding tutorials, politics, personal advice, general trivia, or anything unrelated to supply chain / logistics / fleet operations.

OFF-TOPIC HANDLING:
- If the user asks something outside scope, do NOT answer the off-topic request.
- Politely decline in one sentence and suggest 1–2 relevant logistics questions they can ask instead (e.g. active routes, orders this month, maintenance alerts).

FORMAT:
- Use short paragraphs or bullet points for metrics.
- When citing data, prefer exact figures from LIVE COMPANY DATA.`;

export async function buildLiveCompanyContext(): Promise<string> {
  const [master, logistics] = await Promise.all([
    getMasterOverview(),
    getRoutingLogisticsOverview(),
  ]);

  const activeRoutes = logistics.activeRoutes
    .filter((r) => r.status === "IN_PROGRESS")
    .map(
      (r) =>
        `${r.driver.name}: ${r.totals.deliveredStops}/${r.totals.totalStops} stops, ${r.totals.totalDistanceKm} km, fuel ${formatCurrencyShort(r.totals.fuelCostIdr)}`
    );

  const drivers = logistics.roster
    .map((d) => `${d.name} (${d.status}) — ${d.vehicle.name}`)
    .join("; ");

  return [
    `Snapshot generated: ${master.generatedAt}`,
    "",
    "PIPELINE:",
    `Received ${master.pipeline.RECEIVED}, Preparing ${master.pipeline.PREPARING}, On route ${master.pipeline.ON_ROUTE}, Delivered ${master.pipeline.DELIVERED} (total orders ${master.totalOrders})`,
    "",
    "ROUTES:",
    `Planned ${master.routeCounts.planned}, In progress ${master.routeCounts.inProgress}, Completed ${master.routeCounts.completed}`,
    `Active delivery progress: ${master.operations.deliveryProgressPercent}% (${master.operations.deliveredStops}/${master.operations.totalDeliveryStops} stops)`,
    activeRoutes.length > 0
      ? `Active routes: ${activeRoutes.join(" | ")}`
      : "No routes currently in progress.",
    "",
    "FLEET:",
    `Vehicles ${master.fleetHealth.totalVehicles}, avg VQI ${master.fleetHealth.avgVqi}, high risk ${master.fleetHealth.highRiskCount}`,
    `90-day maintenance exposure: ${master.fleetHealth.upcomingMaintenanceCount} vehicles`,
    "",
    "DRIVERS:",
    drivers || "No drivers seeded.",
    "",
    "FUEL & OPS:",
    `Active route fuel spend ${formatCurrencyShort(master.operations.totalFuelCostIdr)}, savings ${formatCurrencyShort(master.operations.totalFuelCostSavingsIdr)} (${master.operations.totalFuelCostSavingsPercent}%)`,
    `Avg DTI ${master.operations.avgDti ?? "n/a"}, Avg CFI ${master.operations.avgCfi ?? "n/a"}`,
  ].join("\n");
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

export async function callOpenAiCompatibleChat(input: {
  settings: AiProviderSettings;
  userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  companyContext: string;
}): Promise<string> {
  const url = `${normalizeBaseUrl(input.settings.baseUrl)}/chat/completions`;

  const messages: LlmChatMessage[] = [
    {
      role: "system",
      content: `${LOGISTICS_EXPERT_SYSTEM}\n\n---\nLIVE COMPANY DATA (authoritative; do not contradict):\n${input.companyContext}`,
    },
    ...(input.history ?? []).slice(-8),
    { role: "user", content: input.userMessage },
  ];

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.settings.apiKey}`,
    },
    body: JSON.stringify({
      model: input.settings.model,
      messages,
      temperature: 0.3,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    let detail = errText.slice(0, 300);
    try {
      const json = JSON.parse(errText) as {
        error?: { message?: string };
        message?: string;
      };
      detail = json.error?.message ?? json.message ?? detail;
    } catch {
      /* use raw text */
    }
    throw new Error(detail || `LLM request failed (HTTP ${res.status})`);
  }

  const json: {
    choices?: Array<{ message?: { content?: string } }>;
  } = await res.json();

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("LLM returned an empty response");
  }

  return content;
}

export async function testOpenAiCompatibleConnection(
  settings: AiProviderSettings
): Promise<{ ok: true; sample: string }> {
  const reply = await callOpenAiCompatibleChat({
    settings,
    userMessage:
      "Reply with exactly: BALON logistics assistant ready. (This is a connection test.)",
    companyContext: "Test context — no live data required for this ping.",
  });

  return { ok: true, sample: reply.slice(0, 200) };
}
