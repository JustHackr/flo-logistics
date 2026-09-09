/**
 * Capture FLO demo screenshots for the GitHub README.
 * Run: node docs/capture-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "screenshots");
const BASE = "https://radr.nxtdev.xyz/flo-logistics/demo";

const shots = [
  { name: "01-login.png", path: "/login", before: null },
  { name: "02-home.png", path: "/", afterLogin: true },
  { name: "03-routing-plan.png", path: "/routing/plan", afterLogin: true },
  { name: "04-fleet-vehicles.png", path: "/vehicles", afterLogin: true },
  { name: "05-cv-tour.png", path: "/computer-vision/tour", afterLogin: true },
  { name: "06-designer.png", path: "/admin/designer", afterLogin: true },
  { name: "07-process-map.png", path: "/admin/process-map", afterLogin: true },
  { name: "08-sovereign-ai.png", path: "/sovereign-ai", afterLogin: true },
];

async function dismissOverlays(page) {
  // Welcome tour / workflow guide dialogs
  for (const label of ["Skip", "Got it", "Done", "Close"]) {
    const btn = page.getByRole("button", { name: label });
    if (await btn.count()) {
      try {
        await btn.first().click({ timeout: 1500 });
        await page.waitForTimeout(400);
      } catch {
        /* ignore */
      }
    }
  }
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Login as Demo Admin via persona button
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.screenshot({ path: path.join(OUT, "01-login.png"), fullPage: false });

  const adminBtn = page.getByRole("button", { name: /Sign in Demo Admin/i });
  if (await adminBtn.count()) {
    await adminBtn.click();
  } else {
    // Already signed in
    const cont = page.getByRole("link", { name: /Continue to dashboard/i });
    if (await cont.count()) await cont.click();
    else {
      await page.fill('input[type="email"], input[name="email"], #email', "admin@flo.demo");
      await page.fill('input[type="password"], input[name="password"], #password', "demo1234");
      await page.getByRole("button", { name: /^Sign in$/i }).click();
    }
  }
  await page.waitForURL(/\/(flo-logistics\/demo)?\/?($|\?)/, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  for (const shot of shots) {
    if (shot.name === "01-login.png") continue;
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle", timeout: 60_000 });
    await page.waitForTimeout(1200);
    await dismissOverlays(page);
    await page.waitForTimeout(600);
    await page.screenshot({
      path: path.join(OUT, shot.name),
      fullPage: false,
    });
    console.log("saved", shot.name);
  }

  await browser.close();
  console.log("done →", OUT);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
