export const RETURN_STATES = [
  "REQUESTED", "APPROVED", "AWAITING_PICKUP", "PICKED_UP", "IN_TRANSIT",
  "RECEIVED_AT_HUB", "SCAN_REVIEW", "INSPECTION_PENDING", "INSPECTION_COMPLETE",
  "FRAUD_REVIEW", "DISPOSITION_PENDING", "RESTOCKED", "REPAIR_REQUIRED",
  "RECYCLED", "REJECTED", "REFUND_PENDING", "REFUND_APPROVED", "REFUND_HELD", "REFUND_REJECTED", "CLOSED",
] as const;
export type ReturnState = (typeof RETURN_STATES)[number];

export const RETURN_SCAN_OUTCOMES = ["VERIFIED", "DUPLICATE_SCAN", "EXPIRED_RETURN", "UNKNOWN_RETURN", "WRONG_HUB", "WRONG_ITEM", "INVALID_SIGNATURE", "RETURN_ALREADY_CLOSED", "MANUAL_REVIEW"] as const;
export type ReturnScanOutcome = (typeof RETURN_SCAN_OUTCOMES)[number];
export type ReturnRiskLevel = "LOW" | "WATCH" | "HIGH" | "CRITICAL";
export type InspectionResult = "PASS" | "MINOR_DAMAGE" | "MAJOR_DAMAGE" | "WRONG_ITEM" | "MISSING_ACCESSORY" | "COUNTERFEIT_SUSPECTED" | "UNSAFE" | "UNREADABLE" | "MANUAL_REVIEW";
export type FraudSignal = { key: string; label: string; points: number; triggered: boolean; explanation: string; sourceEventIds: string[] };
export type FraudAssessment = { score: number; riskLevel: ReturnRiskLevel; confidence: "LOW" | "MEDIUM" | "HIGH"; signals: FraudSignal[]; reasons: string[]; recommendation: string; requiresApproval: boolean; sourceEventIds: string[] };
export type RefundDecision = "FULL_REFUND" | "PARTIAL_REFUND" | "REFUND_AFTER_REPAIR" | "REFUND_HELD" | "REFUND_REJECTED" | "MANUAL_REVIEW";
export type Disposition = "RESTOCK" | "REPAIR" | "RECYCLE" | "REJECT" | "MANUAL_REVIEW";

export type ReturnCaseView = {
  id: string;
  externalReturnId: string;
  orderId: string | null;
  externalOrderId: string | null;
  customerReference: string | null;
  reason: string;
  state: ReturnState;
  expectedHub: string;
  currentHub: string | null;
  dataSource: string;
  riskLevel: ReturnRiskLevel;
  riskScore: number;
  expectedSku: string | null;
  currentSku: string | null;
  expectedSerial: string | null;
  currentSerial: string | null;
  parcelCode: string | null;
  latestInspection: { result: InspectionResult; notes: string | null; createdAt: string } | null;
  latestFraud: FraudAssessment | null;
  latestRefund: { decision: RefundDecision; amount: number; status: string; rationale: string } | null;
  latestDisposition: { disposition: Disposition; status: string; rationale: string; netRecovery: number } | null;
  cost: { totalCost: number; recoveryValue: number; netRecovery: number } | null;
  carbonKg: number | null;
  openExceptions: number;
  events: Array<{ id: string; eventType: string; fromState: string | null; toState: string | null; location: string | null; dataSource: string; occurredAt: string }>;
};

export type ReturnQuery = { region?: string; hubCode?: string; externalReturnId?: string };
export type NormalizedReturn = { externalReturnId: string; externalOrderId?: string; reason: string; expectedHub: string; state: ReturnState; source: string; dataSource: string };
export type NormalizedReturnEvent = { externalEventId: string; externalReturnId: string; eventType: string; state?: ReturnState; location?: string; occurredAt: Date; source: string };
export type ReturnStatusUpdate = { externalReturnId: string; state: ReturnState; externalEventId?: string; reason?: string };
export interface ReturnsProvider {
  readonly name: string;
  getReturns(input: ReturnQuery): Promise<NormalizedReturn[]>;
  getReturnEvents(input: ReturnQuery): Promise<NormalizedReturnEvent[]>;
  updateReturnStatus(input: ReturnStatusUpdate): Promise<void>;
}
