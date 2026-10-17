import { describe, expect, it } from "vitest";
import {
  buildControlTowerExceptions,
  classifyDelaySeverity,
  classifyUnassignedSeverity,
} from "@/lib/control-tower";

describe("control tower risk rules", () => {
  it("escalates unassigned orders as they age", () => {
    expect(classifyUnassignedSeverity(30)).toBe("watch");
    expect(classifyUnassignedSeverity(6 * 60)).toBe("high");
    expect(classifyUnassignedSeverity(12 * 60)).toBe("critical");
  });

  it("treats a delay of at least one hour as critical", () => {
    expect(classifyDelaySeverity(10)).toBe("high");
    expect(classifyDelaySeverity(60)).toBe("critical");
  });

  it("sorts a mixed queue by operational urgency", () => {
    const now = new Date("2026-09-14T10:00:00.000Z");
    const exceptions = buildControlTowerExceptions({
      now,
      unassignedOrders: [
        {
          id: "new-order",
          recipientAddress: "New order",
          receivedAt: new Date("2026-09-14T09:30:00.000Z"),
        },
        {
          id: "old-order",
          recipientAddress: "Old order",
          receivedAt: new Date("2026-09-13T20:00:00.000Z"),
        },
      ],
      routeStops: [
        {
          routePlanId: "route-1",
          orderId: "late-order",
          orderStatus: "ON_ROUTE",
          recipientAddress: "Late order",
          etaAt: new Date("2026-09-14T08:30:00.000Z"),
          driverName: "Driver",
        },
        {
          routePlanId: "route-1",
          orderId: "soon-order",
          orderStatus: "ON_ROUTE",
          recipientAddress: "Soon order",
          etaAt: new Date("2026-09-14T10:15:00.000Z"),
          driverName: "Driver",
        },
      ],
      fleetRisks: [],
    });

    expect(exceptions.map((exception) => exception.id)).toEqual([
      "unassigned-old-order",
      "late-late-order",
      "unassigned-new-order",
      "sla-watch-soon-order",
    ]);
  });
});
