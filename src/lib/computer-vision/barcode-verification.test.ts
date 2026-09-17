import { describe, expect, it } from "vitest";
import { BARCODE_FIXTURES, barcodeSvg, syntheticBarcodeVerification } from "./barcode-verification";
import { QR_FIXTURES, syntheticQrVerification } from "./qr-verification";

describe("parcel barcode verification", () => {
  it("ships a varied deterministic fixture catalog", () => {
    expect(BARCODE_FIXTURES).toHaveLength(8);
    expect(BARCODE_FIXTURES.map((fixture) => fixture.kind)).toEqual(expect.arrayContaining(["verified", "not_ready", "unknown", "duplicate", "damaged"]));
    expect(new Set(BARCODE_FIXTURES.map((fixture) => fixture.assetPath)).size).toBe(BARCODE_FIXTURES.length);
  });

  it("generates a machine-readable Code 128B SVG with a quiet zone", () => {
    const svg = barcodeSvg("BLI-DEMO-1001");
    expect(svg).toContain("Barcode BLI-DEMO-1001");
    expect(svg).toContain('x="16" y="12"');
    expect(svg).toContain('height="140"');
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThan(20);
  });

  it("keeps the synthetic decision paths explainable", () => {
    expect(syntheticBarcodeVerification("BLI-DEMO-1001").outcome).toBe("VERIFIED");
    expect(syntheticBarcodeVerification("BLI-DEMO-1003").outcome).toBe("REVIEW");
    expect(syntheticBarcodeVerification("BLI-DEMO-9999").outcome).toBe("EXCEPTION");
    expect(syntheticBarcodeVerification("BLI-DEMO-1001", BARCODE_FIXTURES.find((fixture) => fixture.id === "duplicate"))?.message).toContain("already");
  });

  it("ships QR fixtures that use the same decision vocabulary", () => {
    expect(QR_FIXTURES).toHaveLength(8);
    expect(new Set(QR_FIXTURES.map((fixture) => fixture.assetPath)).size).toBe(QR_FIXTURES.length);
    const result = syntheticQrVerification("BLI-DEMO-1001", QR_FIXTURES[0]);
    expect(result.format).toBe("QR_CODE");
    expect(result.outcome).toBe("VERIFIED");
    expect(result.checks.map((check) => check.key)).toContain("OMS_MATCH");
  });
});
