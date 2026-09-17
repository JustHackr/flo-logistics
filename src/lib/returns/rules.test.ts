import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "./state-machine";
import { inspectReturn } from "./inspection";
import { assessReturnFraud } from "./fraud";
import { recommendRefund } from "./refunds";
import { recommendDisposition } from "./disposition";
import { calculateReturnEconomics } from "./economics";

describe("reverse logistics decision rules", () => {
  it("enforces custody and inspection prerequisites", () => {
    expect(canTransition("REQUESTED", "APPROVED")).toBe(true);
    expect(() => assertTransition("REQUESTED", "DISPOSITION_PENDING", { inspectionComplete: false })).toThrow();
    expect(() => assertTransition("INSPECTION_COMPLETE", "CLOSED", { inspectionComplete: true, unresolvedFraud: true })).toThrow();
  });

  it("normalizes inspection fixtures into structured results", () => {
    const result = inspectReturn({ fixtureId: "water", checklist: { safeForResale: false } });
    expect(result.result).toBe("UNSAFE");
    expect(result.source).toContain("FIXTURE");
  });

  it("explains high-risk fraud instead of auto rejecting", () => {
    const assessment = assessReturnFraud({ serialMismatch: true, duplicateScan: true, missingCustody: true });
    expect(assessment.score).toBeGreaterThanOrEqual(45);
    expect(assessment.requiresApproval).toBe(true);
    expect(assessment.recommendation).toContain("Hold");
  });

  it("separates refund and disposition decisions", () => {
    const fraud = assessReturnFraud({});
    expect(recommendRefund({ inspection: "MINOR_DAMAGE", fraud, itemValue: 100000 }).decision).toBe("PARTIAL_REFUND");
    expect(recommendDisposition({ inspection: "PASS", fraud, itemValue: 100000 }).disposition).toBe("RESTOCK");
  });

  it("makes the recovery and carbon assumptions visible", () => {
    const economics = calculateReturnEconomics({ itemValue: 500000, distanceKm: 20, disposition: "RESTOCK" });
    expect(economics.totalCost).toBeGreaterThan(0);
    expect(economics.recoveryValue).toBe(500000);
    expect(economics.carbonKg).toBeGreaterThan(0);
    expect(economics.isEstimate).toBe(true);
  });
});
