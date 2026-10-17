import type { BarcodeFixture, BarcodeVerification, VerificationCheck } from "./barcode-verification";

export type QrFixture = Omit<BarcodeFixture, "assetPath"> & { assetPath: string };

export const QR_FIXTURES: QrFixture[] = [
  { id: "qr-verified", code: "BLI-DEMO-1001", title: "QR ready for dispatch", description: "Known OMS order with a ready WMS status.", kind: "verified", packageCondition: "SEALED", expectedLane: "JKT-01", assetPath: "/cv/qr/parcel-qr-verified.svg" },
  { id: "qr-packed", code: "BLI-DEMO-1003", title: "QR packed hold", description: "Known order, but WMS still reports PACKED.", kind: "not_ready", packageCondition: "SEALED", expectedLane: "JKT-01", assetPath: "/cv/qr/parcel-qr-packed.svg" },
  { id: "qr-unknown", code: "BLI-DEMO-QR-9999", title: "QR unknown order", description: "A QR code that does not exist in OMS.", kind: "unknown", packageCondition: "SEALED", expectedLane: "HOLD", assetPath: "/cv/qr/parcel-qr-unknown.svg" },
  { id: "qr-duplicate", code: "BLI-DEMO-1001", title: "QR duplicate scan", description: "A duplicate label scenario for operator training.", kind: "duplicate", packageCondition: "SEALED", expectedLane: "JKT-01", assetPath: "/cv/qr/parcel-qr-duplicate.svg" },
  { id: "qr-damaged", code: "BLI-DEMO-1002", title: "QR damaged parcel", description: "Valid identity with a packaging review cue.", kind: "damaged", packageCondition: "DAMAGED", expectedLane: "JKT-01", assetPath: "/cv/qr/parcel-qr-damaged.svg" },
  { id: "qr-lane-a", code: "BLI-DEMO-1004", title: "QR lane A", description: "Synthetic label for lane assignment practice.", kind: "verified", packageCondition: "SEALED", expectedLane: "JKT-02", assetPath: "/cv/qr/parcel-qr-lane-a.svg" },
  { id: "qr-lane-b", code: "BLI-DEMO-1005", title: "QR lane B", description: "Synthetic label for a different dispatch lane.", kind: "verified", packageCondition: "SEALED", expectedLane: "JKT-03", assetPath: "/cv/qr/parcel-qr-lane-b.svg" },
  { id: "qr-returns", code: "BLI-RETURN-2001", title: "QR returns hold", description: "Return label that must stay in the returns workflow.", kind: "not_ready", packageCondition: "SEALED", expectedLane: "RETURNS", assetPath: "/cv/qr/parcel-qr-returns.svg" },
];

export function findQrFixtureById(id: string) { return QR_FIXTURES.find((fixture) => fixture.id === id); }

export function syntheticQrVerification(code: string, selectedFixture?: QrFixture): BarcodeVerification {
  const fixture = selectedFixture;
  const result = fixture ? syntheticFixtureResult(fixture) : null;
  if (result) return { ...result, code: code.trim().toUpperCase(), format: "QR_CODE", fixture };
  const checks: VerificationCheck[] = [
    { key: "FORMAT_DECODED", label: "QR code decoded", status: "PASS" },
    { key: "OMS_MATCH", label: "OMS order match", status: "FAIL" },
    { key: "WMS_READY", label: "WMS dispatch readiness", status: "FAIL" },
  ];
  return { code: code.trim().toUpperCase(), format: "QR_CODE", outcome: "EXCEPTION", source: "SYNTHETIC", message: "QR code is not present in the OMS fixture catalog.", nextAction: "Hold the parcel and create an exception for warehouse review.", checks };
}

function syntheticFixtureResult(fixture: QrFixture): BarcodeVerification {
  const base = { code: fixture.code, format: "QR_CODE" as const, source: "SYNTHETIC" as const, fixture };
  const decoded = { key: "FORMAT_DECODED" as const, label: "QR code decoded", status: "PASS" as const };
  if (fixture.kind === "duplicate") return { ...base, outcome: "EXCEPTION", message: "This QR label was already scanned for the current dispatch batch.", nextAction: "Check the parcel and remove the duplicate scan before dispatch.", checks: [decoded, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "PASS" }, { key: "DUPLICATE_SCAN_FREE", label: "Duplicate scan check", status: "FAIL" }] };
  if (fixture.kind === "unknown") return { ...base, outcome: "EXCEPTION", message: "QR code is not present in the OMS fixture catalog.", nextAction: "Hold the parcel and create an exception for warehouse review.", checks: [decoded, { key: "OMS_MATCH", label: "OMS order match", status: "FAIL" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "FAIL" }] };
  if (fixture.kind === "not_ready") return { ...base, outcome: "REVIEW", message: "Order is known, but fulfillment is not ready for dispatch.", nextAction: `Keep the parcel in ${fixture.expectedLane} until WMS reaches READY_FOR_DISPATCH.`, checks: [decoded, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "WARN" }, { key: "ROUTE_ASSIGNED", label: "Route assignment", status: "PASS" }] };
  if (fixture.kind === "damaged") return { ...base, outcome: "REVIEW", message: "QR code is valid, but the package image requires a manual packaging review.", nextAction: "Inspect the damaged corner and confirm the parcel can travel safely.", checks: [decoded, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "PASS" }, { key: "PACKAGE_REVIEW", label: "Package condition review", status: "WARN" }] };
  return { ...base, outcome: "VERIFIED", message: "QR code, OMS identity, route assignment, and dispatch readiness are valid.", nextAction: `Release the parcel to dispatch lane ${fixture.expectedLane}.`, checks: [decoded, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "PASS" }, { key: "ROUTE_ASSIGNED", label: "Route assignment", status: "PASS" }, { key: "DUPLICATE_SCAN_FREE", label: "Duplicate scan check", status: "PASS" }] };
}
