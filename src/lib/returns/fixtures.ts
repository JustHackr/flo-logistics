import type { NormalizedReturn, NormalizedReturnEvent } from "./types";

export const RETURN_DEMO_ID = "BLI-RET-DEMO-001";
export const RETURN_FIXTURES: NormalizedReturn[] = [{ externalReturnId: RETURN_DEMO_ID, externalOrderId: "BLI-DEMO-1003", reason: "DAMAGED_IN_TRANSIT", expectedHub: "JKT-01", state: "REQUESTED", source: "fixture", dataSource: "SYNTHETIC" }];
export const RETURN_EVENT_FIXTURES: NormalizedReturnEvent[] = [
  { externalEventId: "ret-demo-created", externalReturnId: RETURN_DEMO_ID, eventType: "RETURN_CREATED", state: "REQUESTED", location: "Blibli OMS", occurredAt: new Date("2026-09-17T01:00:00.000Z"), source: "fixture" },
];
