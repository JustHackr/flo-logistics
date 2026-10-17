export type BarcodeFixtureKind = "verified" | "not_ready" | "unknown" | "duplicate" | "damaged";

export type BarcodeFixture = {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: BarcodeFixtureKind;
  packageCondition: "SEALED" | "DAMAGED" | "MISSING_LABEL";
  expectedLane: string;
  assetPath: string;
};

export type BarcodeVerificationOutcome = "VERIFIED" | "REVIEW" | "EXCEPTION";
export type ScanFormat = "BARCODE" | "QR_CODE";

export type VerificationCheck = {
  key: "FORMAT_DECODED" | "OMS_MATCH" | "WMS_READY" | "ROUTE_ASSIGNED" | "DUPLICATE_SCAN_FREE" | "PACKAGE_REVIEW";
  label: string;
  status: "PASS" | "WARN" | "FAIL";
};

export type BarcodeVerification = {
  code: string;
  format: ScanFormat;
  outcome: BarcodeVerificationOutcome;
  source: "SYNTHETIC" | "OMS_WMS";
  message: string;
  nextAction: string;
  checks: VerificationCheck[];
  fixture?: BarcodeFixture;
};

export const BARCODE_FIXTURES: BarcodeFixture[] = [
  { id: "verified", code: "BLI-DEMO-1001", title: "Ready for dispatch", description: "Known OMS order with a ready WMS status.", kind: "verified", packageCondition: "SEALED", expectedLane: "JKT-01", assetPath: "/cv/barcodes/parcel-verified.svg" },
  { id: "packed", code: "BLI-DEMO-1003", title: "Not ready yet", description: "Known order, but WMS still reports PACKED.", kind: "not_ready", packageCondition: "SEALED", expectedLane: "JKT-01", assetPath: "/cv/barcodes/parcel-packed.svg" },
  { id: "unknown", code: "BLI-DEMO-9999", title: "Unknown order", description: "A synthetically printed code that is not in OMS.", kind: "unknown", packageCondition: "SEALED", expectedLane: "HOLD", assetPath: "/cv/barcodes/parcel-unknown.svg" },
  { id: "duplicate", code: "BLI-DEMO-1001", title: "Duplicate scan", description: "Scan the same known code twice to demonstrate duplicate handling.", kind: "duplicate", packageCondition: "SEALED", expectedLane: "JKT-01", assetPath: "/cv/barcodes/parcel-duplicate.svg" },
  { id: "damaged", code: "BLI-DEMO-1002", title: "Review packaging", description: "Known OMS order with a damaged-package visual review cue.", kind: "damaged", packageCondition: "DAMAGED", expectedLane: "JKT-01", assetPath: "/cv/barcodes/parcel-damaged.svg" },
  { id: "lane-a", code: "BLI-DEMO-1004", title: "Lane A label", description: "Synthetic label for a routing-lane practice scan.", kind: "verified", packageCondition: "SEALED", expectedLane: "JKT-02", assetPath: "/cv/barcodes/parcel-lane-a.svg" },
  { id: "lane-b", code: "BLI-DEMO-1005", title: "Lane B label", description: "Synthetic label for a different dispatch lane.", kind: "verified", packageCondition: "SEALED", expectedLane: "JKT-03", assetPath: "/cv/barcodes/parcel-lane-b.svg" },
  { id: "returns", code: "BLI-RETURN-2001", title: "Returns hold", description: "Synthetic return label that should be routed to review.", kind: "not_ready", packageCondition: "SEALED", expectedLane: "RETURNS", assetPath: "/cv/barcodes/parcel-returns.svg" },
];

export function findBarcodeFixture(code: string) {
  return BARCODE_FIXTURES.find((fixture) => fixture.code === code.trim().toUpperCase());
}

export function findBarcodeFixtureById(id: string) {
  return BARCODE_FIXTURES.find((fixture) => fixture.id === id);
}

export function syntheticBarcodeVerification(code: string, selectedFixture?: BarcodeFixture): BarcodeVerification {
  const normalized = code.trim().toUpperCase();
  const fixture = selectedFixture ?? findBarcodeFixture(normalized);
  const baseChecks: VerificationCheck[] = [{ key: "FORMAT_DECODED", label: "Code decoded", status: fixture ? "PASS" : "FAIL" }];
  if (!fixture || fixture.kind === "unknown") return { code: normalized, format: "BARCODE", outcome: "EXCEPTION", source: "SYNTHETIC", message: "Barcode is not present in the OMS fixture catalog.", nextAction: "Hold the parcel and create an exception for warehouse review.", checks: [...baseChecks, { key: "OMS_MATCH", label: "OMS order match", status: "FAIL" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "FAIL" }, { key: "ROUTE_ASSIGNED", label: "Route assignment", status: "WARN" }], fixture };
  if (fixture.kind === "duplicate") return { code: normalized, format: "BARCODE", outcome: "EXCEPTION", source: "SYNTHETIC", message: "This label was already scanned for the current dispatch batch.", nextAction: "Check the parcel and remove the duplicate scan before dispatch.", checks: [...baseChecks, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "PASS" }, { key: "DUPLICATE_SCAN_FREE", label: "Duplicate scan check", status: "FAIL" }], fixture };
  if (fixture.kind === "not_ready") return { code: normalized, format: "BARCODE", outcome: "REVIEW", source: "SYNTHETIC", message: "Order is known, but fulfillment is not ready for dispatch.", nextAction: `Keep the parcel in ${fixture.expectedLane} until WMS reaches READY_FOR_DISPATCH.`, checks: [...baseChecks, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "WARN" }, { key: "ROUTE_ASSIGNED", label: "Route assignment", status: "PASS" }], fixture };
  if (fixture.kind === "damaged") return { code: normalized, format: "BARCODE", outcome: "REVIEW", source: "SYNTHETIC", message: "Barcode is valid, but the package image requires a manual packaging review.", nextAction: "Inspect the damaged corner and confirm the parcel can travel safely.", checks: [...baseChecks, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "PASS" }, { key: "PACKAGE_REVIEW", label: "Package condition review", status: "WARN" }], fixture };
  return { code: normalized, format: "BARCODE", outcome: "VERIFIED", source: "SYNTHETIC", message: "Barcode, OMS identity, route assignment, and dispatch readiness are valid.", nextAction: `Release the parcel to dispatch lane ${fixture.expectedLane}.`, checks: [...baseChecks, { key: "OMS_MATCH", label: "OMS order match", status: "PASS" }, { key: "WMS_READY", label: "WMS dispatch readiness", status: "PASS" }, { key: "ROUTE_ASSIGNED", label: "Route assignment", status: "PASS" }, { key: "DUPLICATE_SCAN_FREE", label: "Duplicate scan check", status: "PASS" }], fixture };
}

const CODE128_PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213", "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132", "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211", "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313", "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331", "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111", "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214", "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111", "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141", "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141", "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
] as const;

function code128Values(value: string) {
  const data = [...value].map((character) => character.charCodeAt(0) - 32);
  if (data.some((item) => item < 0 || item > 94)) throw new Error("Code 128 fixture contains unsupported characters.");
  const checksum = (104 + data.reduce((sum, item, index) => sum + item * (index + 1), 0)) % 103;
  return [104, ...data, checksum, 106];
}

/** Generate a real Code 128B SVG so browser BarcodeDetector can read fixtures. */
export function barcodeSvg(value: string, caption = value) {
  const quietZone = 16;
  let x = quietZone;
  const bars: string[] = [];
  for (const code of code128Values(value)) {
    const pattern = CODE128_PATTERNS[code];
    let black = true;
    for (const width of [...pattern].map(Number)) {
      if (black) bars.push(`<rect x="${x}" y="12" width="${width}" height="96"/>`);
      x += width;
      black = !black;
    }
  }
  const width = x + quietZone;
  const safeCaption = caption.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="140" viewBox="0 0 ${width} 140" role="img" aria-label="Barcode ${safeCaption}"><rect width="100%" height="100%" fill="white"/><g fill="black" shape-rendering="crispEdges">${bars.join("")}</g><text x="${width / 2}" y="130" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" letter-spacing="1">${safeCaption}</text></svg>`;
}
