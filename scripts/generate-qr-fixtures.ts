import "dotenv/config";
import QRCode from "qrcode";
import { mkdir, writeFile } from "node:fs/promises";
import { QR_FIXTURES } from "../src/lib/computer-vision/qr-verification";

async function main() {
  await mkdir("public/cv/qr", { recursive: true });
  for (const fixture of QR_FIXTURES) {
    const svg = await QRCode.toString(fixture.code, { type: "svg", margin: 4, errorCorrectionLevel: "H", width: 360, color: { dark: "#111827", light: "#ffffff" } });
    await writeFile(`public${fixture.assetPath}`, svg, "utf8");
  }
  console.log(`Generated ${QR_FIXTURES.length} QR fixtures in public/cv/qr.`);
}

void main();
