import type { IntegrationFixture } from "./types";

function isoFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export function getIntegrationFixture(fixture: IntegrationFixture) {
  if (fixture === "oms-orders") {
    return [
      {
        externalOrderId: "BLI-DEMO-1001",
        recipientAddress: "Jl. Sudirman Kav. 52-53, Jakarta",
        lat: -6.2252,
        lng: 106.8087,
        accessRequirement: "BOTH",
        promisedAt: isoFromNow(1.5),
        serviceLevel: "SAME_DAY",
        priority: "HIGH",
      },
      {
        externalOrderId: "BLI-DEMO-1002",
        recipientAddress: "Jl. Tebet Barat Dalam, Jakarta",
        lat: -6.2394,
        lng: 106.8498,
        accessRequirement: "MOTORCYCLE_ONLY",
        promisedAt: isoFromNow(3),
        serviceLevel: "NEXT_DAY",
        priority: "NORMAL",
      },
      {
        externalOrderId: "BLI-DEMO-1003",
        recipientAddress: "Jl. Kelapa Gading Boulevard, Jakarta",
        lat: -6.1588,
        lng: 106.9054,
        accessRequirement: "BOTH",
        promisedAt: isoFromNow(5),
        serviceLevel: "NEXT_DAY",
        priority: "NORMAL",
      },
    ];
  }

  return [
    {
      externalOrderId: "BLI-DEMO-1001",
      externalEventId: "BLI-WMS-EVENT-1001",
      status: "EXCEPTION",
      occurredAt: new Date().toISOString(),
      warehouseCode: "BLI-JKT-01",
      reason: "Pick list waiting for stock confirmation",
    },
    {
      externalOrderId: "BLI-DEMO-1002",
      externalEventId: "BLI-WMS-EVENT-1002",
      status: "READY_FOR_DISPATCH",
      occurredAt: new Date().toISOString(),
      warehouseCode: "BLI-JKT-01",
    },
    {
      externalOrderId: "BLI-DEMO-1003",
      externalEventId: "BLI-WMS-EVENT-1003",
      status: "PACKED",
      occurredAt: new Date().toISOString(),
      warehouseCode: "BLI-JKT-01",
    },
  ];
}
