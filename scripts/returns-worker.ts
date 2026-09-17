import "dotenv/config";
import { syncFixtureReturns } from "../src/lib/returns/service";

const intervalMs = Math.max(60_000, Number(process.env.RETURNS_WORKER_INTERVAL_MS ?? 300_000));
async function runOnce() { const result = await syncFixtureReturns(); console.log(`[returns-worker] ${new Date().toISOString()} provider=${result.provider} received=${result.received} created=${result.created}`); }
await runOnce();
if (process.env.RETURNS_WORKER_ONCE !== "true") {
  setInterval(() => void runOnce().catch((error) => console.error("[returns-worker] failed", error)), intervalMs);
}
