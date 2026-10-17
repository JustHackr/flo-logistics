import type { CustodyRiskLevel, EventCheck } from "./types";

const POSITIVE: Record<string, number> = { identity: 20, custodian: 15, hub: 15, oms_wms: 15, location: 10, timestamp: 10, previous: 10, dimensions: 5 };
const NEGATIVE: Record<string, number> = { duplicate: 20, hub: 25, missing: 25, serial: 30, location: 20, timestamp: 20, closed: 30 };

export function calculateConfidence(input: { checks: EventCheck[]; missingHandoff?: boolean; serialMismatch?: boolean; closedReplay?: boolean; previousHandoffComplete?: boolean }): { score: number; riskLevel: CustodyRiskLevel; signals: string[] } {
  let score = 0;
  const signals: string[] = [];
  for (const check of input.checks) {
    const weight = check.passed ? POSITIVE[check.key] : NEGATIVE[check.key];
    if (weight) { score += check.passed ? weight : -weight; signals.push(`${check.passed ? "+" : "−"}${weight} ${check.label}: ${check.detail}`); }
  }
  if (input.previousHandoffComplete) { score += POSITIVE.previous; signals.push("+10 Previous handoff complete."); }
  if (input.missingHandoff) { score -= NEGATIVE.missing; signals.push("−25 Missing handoff detected."); }
  if (input.serialMismatch) { score -= NEGATIVE.serial; signals.push("−30 Serial mismatch detected."); }
  if (input.closedReplay) { score -= NEGATIVE.closed; signals.push("−30 Parcel was scanned after closure."); }
  score = Math.max(0, Math.min(100, score));
  const riskLevel: CustodyRiskLevel = score >= 90 ? "TRUSTED" : score >= 70 ? "VERIFIED" : score >= 40 ? "REVIEW" : "CRITICAL";
  return { score, riskLevel, signals };
}

