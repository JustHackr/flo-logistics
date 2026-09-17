import "dotenv/config";
import { runIntelligenceRefresh } from "../src/lib/intelligence/service";
import { recalculateSlaRisk } from "../src/lib/sla-risk-service";
import { prisma } from "../src/lib/prisma";

const intervalMs = Math.max(60, Number(process.env.INTELLIGENCE_REFRESH_INTERVAL_SEC ?? 300)) * 1000;

async function refresh() {
  try {
    const results = await runIntelligenceRefresh({ mode: process.env.INTELLIGENCE_FIXTURES === "true" ? "fixture" : "live" });
    const risk = await recalculateSlaRisk({ trigger: "WORKER", actorRole: "SYSTEM" });
    console.log(`[intelligence-worker] refreshed ${results.length} region(s), scored ${risk.scanned} order(s) at ${new Date().toISOString()}`);
  } catch (error) {
    console.error("[intelligence-worker] refresh failed:", error);
  }
}

void refresh();
const timer = setInterval(() => void refresh(), intervalMs);

async function shutdown() {
  clearInterval(timer);
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", () => void shutdown());
process.once("SIGTERM", () => void shutdown());
