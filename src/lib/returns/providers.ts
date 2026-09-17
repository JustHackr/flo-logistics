import { RETURN_EVENT_FIXTURES, RETURN_FIXTURES } from "./fixtures";
import type { NormalizedReturn, NormalizedReturnEvent, ReturnQuery, ReturnsProvider, ReturnStatusUpdate } from "./types";

export class FixtureReturnsProvider implements ReturnsProvider {
  readonly name: string = "fixture";
  async getReturns(input: ReturnQuery): Promise<NormalizedReturn[]> { return RETURN_FIXTURES.filter((item) => !input.externalReturnId || item.externalReturnId === input.externalReturnId).filter((item) => !input.hubCode || item.expectedHub === input.hubCode); }
  async getReturnEvents(input: ReturnQuery): Promise<NormalizedReturnEvent[]> { return RETURN_EVENT_FIXTURES.filter((item) => !input.externalReturnId || item.externalReturnId === input.externalReturnId); }
  async updateReturnStatus(input: ReturnStatusUpdate) { void input; return; }
}

async function fetchJson(url: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
    if (!response.ok) throw new Error(`Returns provider responded ${response.status}`);
    return await response.json() as unknown;
  } finally { clearTimeout(timer); }
}

function normalizeRows(value: unknown, source: string): NormalizedReturn[] {
  const rows = Array.isArray(value) ? value : typeof value === "object" && value !== null && Array.isArray((value as { returns?: unknown[] }).returns) ? (value as { returns: unknown[] }).returns : [];
  return rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    if (typeof item.externalReturnId !== "string" || typeof item.reason !== "string" || typeof item.expectedHub !== "string") return [];
    return [{ externalReturnId: item.externalReturnId, externalOrderId: typeof item.externalOrderId === "string" ? item.externalOrderId : undefined, reason: item.reason, expectedHub: item.expectedHub, state: typeof item.state === "string" ? item.state as NormalizedReturn["state"] : "REQUESTED", source, dataSource: "LIVE" }];
  });
}

export class BlibliOmsReturnsProvider extends FixtureReturnsProvider {
  readonly name: string = "blibli_oms";
  async getReturns(input: ReturnQuery) {
    const url = process.env.BLIBLI_OMS_RETURNS_URL;
    if (!url) return super.getReturns(input);
    try { return normalizeRows(await fetchJson(url), this.name).filter((item) => !input.externalReturnId || item.externalReturnId === input.externalReturnId); }
    catch (error) { console.warn("[returns] OMS provider failed; using fixture fallback", error instanceof Error ? error.message : error); return super.getReturns(input); }
  }
  async updateReturnStatus(input: ReturnStatusUpdate) {
    const url = process.env.BLIBLI_OMS_RETURNS_URL;
    if (!url) return;
    await fetchJson(`${url.replace(/\/$/, "")}/${encodeURIComponent(input.externalReturnId)}/status`, { method: "POST", headers: { "Content-Type": "application/json", ...(process.env.BLIBLI_INTEGRATION_TOKEN ? { Authorization: `Bearer ${process.env.BLIBLI_INTEGRATION_TOKEN}` } : {}) }, body: JSON.stringify(input) });
  }
}
export class BlibliWmsReturnsProvider extends BlibliOmsReturnsProvider { readonly name = "blibli_wms"; }

export function getReturnsProvider(): ReturnsProvider { return process.env.BLIBLI_OMS_RETURNS_URL || process.env.BLIBLI_RETURNS_API_URL ? new BlibliOmsReturnsProvider() : new FixtureReturnsProvider(); }
