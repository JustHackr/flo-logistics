import type { ActorInput, CustodyEventInput } from "./types";

export const CUSTODY_DEMO = {
  parcel: "BLI-PARCEL-CUST-001",
  order: "BLI-DEMO-1003",
  returnId: "BLI-RET-DEMO-001",
  origin: "JKT-01",
  destination: "JKT-02",
  driver: "Matthew",
  vehicle: "VAN-03",
} as const;

export const CUSTODY_ACTORS: ActorInput[] = [
  { actorType: "SYSTEM", externalId: "OMS", name: "Blibli OMS" },
  { actorType: "WAREHOUSE", externalId: CUSTODY_DEMO.origin, name: "Warehouse JKT-01", hubCode: CUSTODY_DEMO.origin },
  { actorType: "DRIVER", externalId: "DRV-MATTHEW", name: CUSTODY_DEMO.driver, hubCode: CUSTODY_DEMO.origin, vehicleCode: CUSTODY_DEMO.vehicle },
  { actorType: "VEHICLE", externalId: CUSTODY_DEMO.vehicle, name: "Delivery van VAN-03", vehicleCode: CUSTODY_DEMO.vehicle },
  { actorType: "HUB", externalId: CUSTODY_DEMO.destination, name: "Hub JKT-02", hubCode: CUSTODY_DEMO.destination },
  { actorType: "CUSTOMER", externalId: "CUSTOMER-DEMO-1003", name: "Synthetic customer" },
];

export function demoEvents(parcel: string): CustodyEventInput[] {
  const base = new Date("2026-09-17T01:42:00.000Z").getTime();
  const at = (minutes: number) => new Date(base + minutes * 60_000);
  const warehouse = CUSTODY_ACTORS[1]; const driver = CUSTODY_ACTORS[2]; const vehicle = CUSTODY_ACTORS[3]; const hub = CUSTODY_ACTORS[4];
  return [
    { externalParcelId: parcel, eventType: "PARCEL_CREATED", externalEventId: "cust-demo-oms-created", sourceSystem: "blibli_oms", source: "Fixture OMS adapter", dataSource: "SYNTHETIC", toActor: CUSTODY_ACTORS[0], scanMethod: "OMS_EVENT", observedAt: at(0), evidence: [{ evidenceType: "OMS_EVENT", reference: "BLI-DEMO-1003 created", capturedAt: at(0) }] },
    { externalParcelId: parcel, eventType: "PARCEL_PACKED", externalEventId: "cust-demo-wms-packed", sourceSystem: "blibli_wms", source: "Fixture WMS adapter", dataSource: "SYNTHETIC", fromActor: CUSTODY_ACTORS[0], toActor: warehouse, hubCode: CUSTODY_DEMO.origin, scanMethod: "WMS_EVENT", observedAt: at(10), evidence: [{ evidenceType: "WMS_EVENT", reference: "Packed at JKT-01", capturedAt: at(10) }] },
    { externalParcelId: parcel, eventType: "PARCEL_SEALED", externalEventId: "cust-demo-sealed", sourceSystem: "blibli_wms", source: "Fixture WMS adapter", dataSource: "SYNTHETIC", fromActor: warehouse, toActor: warehouse, hubCode: CUSTODY_DEMO.origin, scanMethod: "QR_SCAN", observedAt: at(20), evidence: [{ evidenceType: "QR_SCAN", reference: "BLI-PARCEL-CUST-001", capturedAt: at(20) }, { evidenceType: "PACKAGE_IMAGE", reference: "synthetic://custody/sealed", capturedAt: at(20) }] },
    { externalParcelId: parcel, eventType: "DRIVER_ACCEPTED", externalEventId: "cust-demo-driver-accepted", sourceSystem: "blibli_wms", source: "Fixture WMS adapter", dataSource: "SYNTHETIC", fromActor: warehouse, toActor: driver, hubCode: CUSTODY_DEMO.origin, scanMethod: "BARCODE_SCAN", observedAt: at(32), evidence: [{ evidenceType: "BARCODE_SCAN", reference: "BLI-PARCEL-CUST-001", capturedAt: at(32) }] },
    { externalParcelId: parcel, eventType: "VEHICLE_LOADED", externalEventId: "cust-demo-vehicle-loaded", sourceSystem: "blibli_wms", source: "Fixture WMS adapter", dataSource: "SYNTHETIC", fromActor: driver, toActor: vehicle, hubCode: CUSTODY_DEMO.origin, scanMethod: "HANDOFF_CONFIRMATION", observedAt: at(40), evidence: [{ evidenceType: "VEHICLE_ASSIGNMENT", reference: "VAN-03", capturedAt: at(40) }] },
    { externalParcelId: parcel, eventType: "VEHICLE_DEPARTED", externalEventId: "cust-demo-departed", sourceSystem: "blibli_tms", source: "Fixture TMS adapter", dataSource: "SYNTHETIC", fromActor: vehicle, toActor: vehicle, hubCode: CUSTODY_DEMO.origin, lat: -6.2088, lng: 106.8456, scanMethod: "GPS_EVENT", observedAt: at(55), evidence: [{ evidenceType: "GPS", reference: "-6.2088,106.8456", capturedAt: at(55) }] },
    { externalParcelId: parcel, eventType: "HUB_ARRIVAL", externalEventId: "cust-demo-arrival", sourceSystem: "blibli_tms", source: "Fixture TMS adapter", dataSource: "SYNTHETIC", fromActor: vehicle, toActor: hub, hubCode: CUSTODY_DEMO.destination, lat: -6.1754, lng: 106.8272, scanMethod: "GPS_EVENT", observedAt: at(94), evidence: [{ evidenceType: "GPS", reference: "-6.1754,106.8272", capturedAt: at(94) }] },
    { externalParcelId: parcel, eventType: "INSPECTION_COMPLETED", externalEventId: "cust-demo-damaged", sourceSystem: "blibli_wms", source: "Fixture WMS adapter", dataSource: "SYNTHETIC", fromActor: hub, toActor: hub, hubCode: CUSTODY_DEMO.destination, scanMethod: "INSPECTION", observedAt: at(124), payload: { condition: "DAMAGED", damageType: "WATER_DAMAGE", lane: "B" }, evidence: [{ evidenceType: "INSPECTION_IMAGE", reference: "synthetic://custody/water-damage", metadata: { condition: "DAMAGED", label: "crushed corner + water marks" }, capturedAt: at(124) }] },
  ];
}

