import type { FraudAssessment, FraudSignal, ReturnRiskLevel } from "./types";

export function assessReturnFraud(input: { qrOutcome?: string; duplicateScan?: boolean; expired?: boolean; wrongHub?: boolean; wrongItem?: boolean; serialMismatch?: boolean; weightMismatch?: boolean; outsidePolicy?: boolean; contradictoryReason?: boolean; resealed?: boolean; missingCustody?: boolean; repeatedAnomalies?: boolean; conditionConflict?: boolean; appearsUsed?: boolean; eventIds?: string[] }): FraudAssessment {
  const definitions: Array<[string, string, number, boolean, string]> = [
    ["QR_MISMATCH", "QR identity or signature is inconsistent", 28, ["UNKNOWN_RETURN", "WRONG_ITEM", "INVALID_SIGNATURE", "WRONG_HUB"].includes(input.qrOutcome ?? ""), "The scanned identity cannot be trusted for this return."],
    ["DUPLICATE_SCAN", "Return was scanned more than once at the same stage", 18, Boolean(input.duplicateScan), "A duplicate custody event may indicate replay or process error."],
    ["EXPIRED_RETURN", "Return label or policy window is expired", 22, Boolean(input.expired), "The return is outside the configured return window."],
    ["SERIAL_MISMATCH", "Serial number mismatch", 30, Boolean(input.serialMismatch), "The observed serial does not match the order record."],
    ["WEIGHT_MISMATCH", "Weight differs materially from expected", 16, Boolean(input.weightMismatch), "Weight variance conflicts with the expected parcel contents."],
    ["POLICY_CONFLICT", "Return reason or timing conflicts with policy", 12, Boolean(input.outsidePolicy || input.contradictoryReason), "The request needs policy review before refund or disposition."],
    ["CONDITION_CONFLICT", "Inspection evidence conflicts with the requested reason", 15, Boolean(input.conditionConflict || input.resealed || input.appearsUsed), "Observed condition does not cleanly support the customer reason."],
    ["CUSTODY_GAP", "A custody handoff is missing", 20, Boolean(input.missingCustody), "The timeline has a gap between expected custody stages."],
    ["REPEATED_ANOMALY", "Repeated anomaly pattern", 12, Boolean(input.repeatedAnomalies), "Similar anomalies were observed across the return history."],
  ];
  const signals: FraudSignal[] = definitions.map(([key, label, points, triggered, explanation]) => ({ key, label, points, triggered, explanation, sourceEventIds: input.eventIds ?? [] }));
  const score = Math.min(100, signals.filter((signal) => signal.triggered).reduce((sum, signal) => sum + signal.points, 0));
  const riskLevel: ReturnRiskLevel = score >= 70 ? "CRITICAL" : score >= 45 ? "HIGH" : score >= 20 ? "WATCH" : "LOW";
  const reasons = signals.filter((signal) => signal.triggered).map((signal) => signal.explanation);
  return { score, riskLevel, confidence: score >= 45 ? "HIGH" : reasons.length > 0 ? "MEDIUM" : "LOW", signals, reasons, recommendation: riskLevel === "LOW" ? "Continue to policy-based refund and disposition review." : riskLevel === "WATCH" ? "Ask warehouse to verify identity and custody before approval." : "Hold refund and require Ops Manager review with evidence.", requiresApproval: riskLevel === "HIGH" || riskLevel === "CRITICAL", sourceEventIds: input.eventIds ?? [] };
}
