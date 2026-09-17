import type { ReturnState } from "./types";

const transitions: Record<ReturnState, ReturnState[]> = {
  REQUESTED: ["APPROVED", "REJECTED"],
  APPROVED: ["AWAITING_PICKUP", "REJECTED"],
  AWAITING_PICKUP: ["PICKED_UP", "REJECTED"],
  PICKED_UP: ["IN_TRANSIT", "RECEIVED_AT_HUB"],
  IN_TRANSIT: ["RECEIVED_AT_HUB"],
  RECEIVED_AT_HUB: ["SCAN_REVIEW"],
  SCAN_REVIEW: ["INSPECTION_PENDING", "FRAUD_REVIEW", "REJECTED"],
  INSPECTION_PENDING: ["INSPECTION_COMPLETE", "FRAUD_REVIEW"],
  INSPECTION_COMPLETE: ["FRAUD_REVIEW", "DISPOSITION_PENDING", "REFUND_PENDING"],
  FRAUD_REVIEW: ["INSPECTION_COMPLETE", "DISPOSITION_PENDING", "REFUND_PENDING", "REFUND_HELD", "REJECTED"],
  DISPOSITION_PENDING: ["RESTOCKED", "REPAIR_REQUIRED", "RECYCLED", "REJECTED", "REFUND_PENDING"],
  RESTOCKED: ["REFUND_PENDING", "CLOSED"],
  REPAIR_REQUIRED: ["REFUND_PENDING", "CLOSED"],
  RECYCLED: ["REFUND_PENDING", "CLOSED"],
  REJECTED: ["CLOSED"],
  REFUND_PENDING: ["REFUND_APPROVED", "REFUND_HELD", "REFUND_REJECTED"],
  REFUND_APPROVED: ["CLOSED"],
  REFUND_HELD: ["FRAUD_REVIEW", "REFUND_APPROVED", "REFUND_REJECTED"],
  REFUND_REJECTED: ["CLOSED"],
  CLOSED: [],
};

export function canTransition(from: ReturnState, to: ReturnState) { return transitions[from]?.includes(to) ?? false; }

export function assertTransition(from: ReturnState, to: ReturnState, context: { validQr?: boolean; inspectionComplete?: boolean; unresolvedFraud?: boolean; reason?: string } = {}) {
  if (!canTransition(from, to)) throw new Error(`Return cannot move from ${from} to ${to}.`);
  if (["DISPOSITION_PENDING", "REFUND_PENDING"].includes(to) && !context.inspectionComplete) throw new Error("Inspection must be complete before disposition or refund review.");
  if (to === "INSPECTION_PENDING" && context.validQr === false) throw new Error("A valid return QR scan is required before inspection.");
  if (to === "CLOSED" && context.unresolvedFraud) throw new Error("Return cannot close while fraud review is unresolved.");
  if (to === "REJECTED" && !context.reason?.trim()) throw new Error("A rejection reason is required.");
}

export function nextStateForScan(outcome: string): ReturnState { return outcome === "VERIFIED" ? "INSPECTION_PENDING" : "FRAUD_REVIEW"; }
