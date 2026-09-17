import type { FraudAssessment, InspectionResult, RefundDecision } from "./types";

export function recommendRefund(input: { inspection: InspectionResult; fraud: FraudAssessment; itemValue: number; reason?: string; policyWindowValid?: boolean }) {
  if (input.policyWindowValid === false || input.fraud.riskLevel === "CRITICAL") return { decision: "REFUND_HELD" as RefundDecision, amount: 0, rationale: "Refund is held pending policy or critical fraud review." };
  if (["WRONG_ITEM", "COUNTERFEIT_SUSPECTED", "UNSAFE"].includes(input.inspection)) return { decision: "MANUAL_REVIEW" as RefundDecision, amount: 0, rationale: "Inspection result requires a human decision before refund." };
  if (input.inspection === "MISSING_ACCESSORY" || input.inspection === "MAJOR_DAMAGE") return { decision: "PARTIAL_REFUND" as RefundDecision, amount: Math.round(input.itemValue * 0.7), rationale: "Material condition issue suggests a partial refund pending approval." };
  if (input.inspection === "MINOR_DAMAGE") return { decision: "PARTIAL_REFUND" as RefundDecision, amount: Math.round(input.itemValue * 0.9), rationale: "Minor damage detected; partial refund preserves a recovery option." };
  return { decision: "FULL_REFUND" as RefundDecision, amount: input.itemValue, rationale: "Identity is valid and inspection passed." };
}
