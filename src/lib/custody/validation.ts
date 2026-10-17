import type { CustodyEventInput, EventCheck, ValidationStatus } from "./types";

export function validateEvent(input: CustodyEventInput, context: {
  parcelBarcode?: string | null;
  parcelQrPayload?: string | null;
  expectedHub?: string | null;
  expectedCustodianId?: string | null;
  previousObservedAt?: Date | null;
  duplicate?: boolean;
  omsWmsAgreement?: boolean;
  locationConsistent?: boolean;
}): { status: ValidationStatus; checks: EventCheck[] } {
  const checks: EventCheck[] = [
    { key: "identity", label: "Parcel identity", passed: Boolean(context.parcelBarcode || context.parcelQrPayload), detail: context.parcelBarcode || context.parcelQrPayload ? "Known barcode or QR identity." : "No parcel identity evidence." },
    { key: "hub", label: "Expected hub", passed: !context.expectedHub || !input.hubCode || context.expectedHub === input.hubCode, detail: !input.hubCode ? "Hub not supplied." : context.expectedHub === input.hubCode ? "Hub matches the expected route." : `Observed at ${input.hubCode}; expected ${context.expectedHub}.` },
    { key: "custodian", label: "Expected custodian", passed: !context.expectedCustodianId || !input.toActor || context.expectedCustodianId === input.toActor.externalId, detail: context.expectedCustodianId && input.toActor && context.expectedCustodianId !== input.toActor.externalId ? "Custodian is outside the assignment." : "Custodian is consistent or not configured." },
    { key: "timestamp", label: "Timestamp ordering", passed: !context.previousObservedAt || input.observedAt >= context.previousObservedAt, detail: !context.previousObservedAt || input.observedAt >= context.previousObservedAt ? "Event order is plausible." : "Event predates the previous observation." },
    { key: "location", label: "Geographic consistency", passed: context.locationConsistent !== false, detail: context.locationConsistent === false ? "Coordinates conflict with the recorded hub." : "Location is consistent or unavailable." },
    { key: "oms_wms", label: "OMS/WMS agreement", passed: context.omsWmsAgreement !== false, detail: context.omsWmsAgreement === false ? "OMS/WMS status conflicts with this event." : "OMS/WMS status agrees or is unavailable." },
    { key: "duplicate", label: "Duplicate status", passed: !context.duplicate, detail: context.duplicate ? "Same source event has already been ingested." : "No duplicate event found." },
  ];
  const failed = checks.filter((check) => !check.passed);
  let status: ValidationStatus = failed.length === 0 ? "VERIFIED" : "PARTIALLY_VERIFIED";
  if (failed.some((check) => ["hub", "custodian", "location", "oms_wms"].includes(check.key))) status = "CONFLICTING";
  if (failed.some((check) => check.key === "duplicate")) status = "SUSPICIOUS";
  if (failed.some((check) => check.key === "timestamp")) status = "CONFLICTING";
  return { status, checks };
}

