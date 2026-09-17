import type { Disposition, FraudAssessment, InspectionResult } from "./types";

export function recommendDisposition(input: { inspection: InspectionResult; fraud: FraudAssessment; itemValue: number; repairCost?: number; recycleCost?: number; handlingCost?: number }) {
  const repairCost = input.repairCost ?? 15000;
  const recycleCost = input.recycleCost ?? 8000;
  const handlingCost = input.handlingCost ?? 5000;
  if (input.fraud.riskLevel === "CRITICAL" || input.inspection === "COUNTERFEIT_SUSPECTED" || input.inspection === "WRONG_ITEM") return { disposition: "REJECT" as Disposition, rationale: "Identity or authenticity is unresolved; do not return to inventory.", recoveryValue: 0, totalCost: handlingCost, netRecovery: -handlingCost };
  if (input.inspection === "UNSAFE") return { disposition: "RECYCLE" as Disposition, rationale: "Safety risk makes restock inappropriate.", recoveryValue: 0, totalCost: recycleCost + handlingCost, netRecovery: -(recycleCost + handlingCost) };
  if (input.inspection === "MAJOR_DAMAGE" && repairCost < input.itemValue * 0.5) return { disposition: "REPAIR" as Disposition, rationale: "Repair cost is below half of item value and preserves recovery.", recoveryValue: Math.round(input.itemValue * 0.8), totalCost: repairCost + handlingCost, netRecovery: Math.round(input.itemValue * 0.8) - repairCost - handlingCost };
  if (["PASS", "MINOR_DAMAGE"].includes(input.inspection)) return { disposition: "RESTOCK" as Disposition, rationale: "Item identity is consistent and condition supports resale or controlled restock.", recoveryValue: input.inspection === "PASS" ? input.itemValue : Math.round(input.itemValue * 0.85), totalCost: handlingCost, netRecovery: (input.inspection === "PASS" ? input.itemValue : Math.round(input.itemValue * 0.85)) - handlingCost };
  return { disposition: "MANUAL_REVIEW" as Disposition, rationale: "Inspection and risk signals conflict; warehouse approval is required.", recoveryValue: 0, totalCost: handlingCost, netRecovery: -handlingCost };
}
