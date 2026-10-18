// Run `prisma migrate deploy` during the build only when DATABASE_URL is set,
// so previews and CI builds without a database still compile.
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[build] DATABASE_URL not set; skipping prisma migrate deploy");
  process.exit(0);
}
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(result.status ?? 1);
