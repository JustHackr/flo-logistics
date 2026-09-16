import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BARCODE_FIXTURES, barcodeSvg } from "../src/lib/computer-vision/barcode-verification";

const outputDir = join(process.cwd(), "public", "cv", "barcodes");
mkdirSync(outputDir, { recursive: true });
for (const fixture of BARCODE_FIXTURES) {
  writeFileSync(join(outputDir, fixture.assetPath.split("/").at(-1) ?? `${fixture.id}.svg`), barcodeSvg(fixture.code, fixture.code), "utf8");
}
console.log(`Generated ${BARCODE_FIXTURES.length} barcode fixture images in ${outputDir}`);
