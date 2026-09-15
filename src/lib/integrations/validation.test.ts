import { describe, expect, it } from "vitest";
import { getIntegrationFixture } from "./fixtures";
import { parseOmsRows, parseWmsRows } from "./validation";

describe("Blibli integration row validation", () => {
  it("accepts the seeded OMS fixture and applies defaults", () => {
    const result = parseOmsRows(getIntegrationFixture("oms-orders"));
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toHaveLength(3);
    expect(result.valid[0]?.accessRequirement).toBe("BOTH");
  });

  it("rejects OMS rows outside Jakarta bounds", () => {
    const result = parseOmsRows([
      {
        externalOrderId: "outside",
        recipientAddress: "Outside",
        lat: 1,
        lng: 1,
        promisedAt: new Date().toISOString(),
      },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors[0]?.error).toBe("Outside Jakarta bounds");
  });

  it("rejects malformed WMS status and keeps row numbers", () => {
    const result = parseWmsRows([
      {
        externalOrderId: "BLI-1",
        externalEventId: "event-1",
        status: "BROKEN",
        occurredAt: new Date().toISOString(),
      },
    ]);
    expect(result.valid).toHaveLength(0);
    expect(result.errors[0]?.row).toBe(2);
  });
});
