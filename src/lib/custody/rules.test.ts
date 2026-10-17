import { describe, expect, it } from "vitest";
import { calculateConfidence } from "./confidence";
import { detectAnomalies } from "./anomaly";
import { buildCustodyGraph, calculateResponsibilityWindow } from "./graph";
import type { CustodyEventView } from "./types";

const actor = (id: string, name = id) => ({ id, actorType: "HUB", externalId: id, name, hubCode: id, vehicleCode: null });
const event = (id: string, type: string, at: string, status: CustodyEventView["validationStatus"] = "VERIFIED"): CustodyEventView => ({ id, eventType: type, externalEventId: id, sourceSystem: "fixture", source: "fixture", dataSource: "SYNTHETIC", fromActor: actor("JKT-01"), toActor: actor("JKT-02"), hubCode: "JKT-02", lat: null, lng: null, scanMethod: "QR_SCAN", correlationId: "test", validationStatus: status, validation: [], confidenceDelta: 10, observedAt: at, receivedAt: at, evidence: [] });

describe("custody rules", () => {
  it("builds a graph from relational event edges", () => { const graph = buildCustodyGraph([event("1", "HUB_ARRIVAL", "2026-01-01T10:00:00Z")]); expect(graph.nodes).toHaveLength(2); expect(graph.edges[0].validationStatus).toBe("VERIFIED"); });
  it("penalizes missing handoffs and produces a review risk", () => { const result = calculateConfidence({ checks: [{ key: "identity", label: "Identity", passed: true, detail: "ok" }, { key: "hub", label: "Hub", passed: true, detail: "ok" }], missingHandoff: true }); expect(result.score).toBe(10); expect(result.riskLevel).toBe("CRITICAL"); expect(result.signals.some((signal) => signal.includes("Missing handoff"))).toBe(true); });
  it("detects a missing destination receiving handoff and condition conflict", () => { const events = [event("1", "PARCEL_SEALED", "2026-01-01T09:42:00Z"), event("2", "HUB_ARRIVAL", "2026-01-01T11:00:00Z"), event("3", "INSPECTION_COMPLETED", "2026-01-01T11:16:00Z", "CONFLICTING")]; const anomalies = detectAnomalies(events, { expectedHub: "JKT-02", conditionConflict: true }); expect(anomalies.map((item) => item.kind)).toEqual(expect.arrayContaining(["CUSTODY_MISSING_HANDOFF", "CUSTODY_CONDITION_CONFLICT"])); });
  it("calculates a review window without assigning blame", () => { const events = [event("1", "PARCEL_SEALED", "2026-01-01T09:42:00Z"), event("2", "INSPECTION_COMPLETED", "2026-01-01T11:16:00Z", "CONFLICTING")]; const window = calculateResponsibilityWindow(events, [{ kind: "CUSTODY_CONDITION_CONFLICT", eventIds: ["2"] }]); expect(window.from).toBe("2026-01-01T09:42:00Z"); expect(window.to).toBe("2026-01-01T11:16:00Z"); expect(window.statement).toContain("not automatic blame"); });
});
