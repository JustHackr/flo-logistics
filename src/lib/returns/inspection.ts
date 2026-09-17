import type { InspectionResult } from "./types";

export const INSPECTION_FIXTURES = [
  { id: "sealed", label: "Sealed and undamaged", result: "PASS" as const, note: "Outer packaging intact, serial and accessories complete." },
  { id: "opened", label: "Opened package", result: "MINOR_DAMAGE" as const, note: "Seal is open but product remains present." },
  { id: "crushed", label: "Crushed corner", result: "MAJOR_DAMAGE" as const, note: "Corner compression requires manual condition review." },
  { id: "water", label: "Water exposure", result: "UNSAFE" as const, note: "Moisture indicator and packaging damage require hold." },
  { id: "torn-label", label: "Torn label", result: "UNREADABLE" as const, note: "Return identity cannot be confidently read from package." },
  { id: "missing-accessory", label: "Missing accessory", result: "MISSING_ACCESSORY" as const, note: "Expected charger/accessory is not present." },
  { id: "wrong-item", label: "Wrong item", result: "WRONG_ITEM" as const, note: "Observed SKU conflicts with the return request." },
  { id: "empty", label: "Empty package", result: "COUNTERFEIT_SUSPECTED" as const, note: "Package arrived without the expected product." },
];

export type Checklist = { outerIntact: boolean; productPackagingSealed: boolean; visibleDamage: boolean; accessoriesComplete: boolean; serialMatches: boolean; misuseObserved: boolean; safeForResale: boolean };

export function inspectReturn(input: { fixtureId?: string; checklist?: Partial<Checklist>; cv?: { blurScore?: number; labelReadable?: boolean; tearScore?: number; waterScore?: number; cornerDamageScore?: number }; expectedSku?: string; observedSku?: string; expectedSerial?: string; observedSerial?: string }) {
  const fixture = INSPECTION_FIXTURES.find((item) => item.id === input.fixtureId);
  const checklist: Checklist = { outerIntact: true, productPackagingSealed: true, visibleDamage: false, accessoriesComplete: true, serialMatches: true, misuseObserved: false, safeForResale: true, ...input.checklist };
  const reasons: string[] = [];
  let result: InspectionResult = fixture?.result ?? "PASS";
  if (input.expectedSku && input.observedSku && input.expectedSku !== input.observedSku) { result = "WRONG_ITEM"; reasons.push("Observed SKU does not match the return request."); }
  if (input.expectedSerial && input.observedSerial && input.expectedSerial !== input.observedSerial) { result = "MANUAL_REVIEW"; reasons.push("Serial number does not match the order record."); }
  if (!checklist.accessoriesComplete) { result = "MISSING_ACCESSORY"; reasons.push("One or more expected accessories are missing."); }
  if (checklist.visibleDamage && result === "PASS") { result = "MAJOR_DAMAGE"; reasons.push("Operator marked visible package or product damage."); }
  if (checklist.misuseObserved) { result = "MANUAL_REVIEW"; reasons.push("Possible misuse requires a policy decision."); }
  if (input.cv?.labelReadable === false) { result = "UNREADABLE"; reasons.push("On-device label readability check failed."); }
  if ((input.cv?.waterScore ?? 0) >= 0.7) { result = "UNSAFE"; reasons.push("On-device visual check detected likely water exposure."); }
  if ((input.cv?.cornerDamageScore ?? 0) >= 0.7 && result === "PASS") { result = "MAJOR_DAMAGE"; reasons.push("On-device visual check detected corner damage."); }
  if ((input.cv?.blurScore ?? 0) >= 0.75) { result = "UNREADABLE"; reasons.push("Image is too blurred for a reliable inspection."); }
  return { result, checklist, reasons: [...(fixture ? [fixture.note] : []), ...reasons], fixtureId: fixture?.id ?? null, cv: input.cv ?? null, source: fixture ? "FIXTURE_AND_MANUAL" : "MANUAL_AND_ON_DEVICE_CV" };
}
