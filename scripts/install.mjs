#!/usr/bin/env node
/**
 * FLO laptop install wizard (interactive or automated).
 *
 * Interactive:
 *   npm run install:flo
 *
 * Automated (no prompts — sovereign defaults):
 *   npm run install:flo -- --yes
 *
 * Options:
 *   --yes                         Non-interactive (defaults: sovereign, seed on)
 *   --mode=sovereign|ollama|openai_compatible
 *   --base-url=URL                LLM /v1 base URL
 *   --model=NAME                  Model id
 *   --api-key=KEY                 Required for openai_compatible
 *   --pull-ollama                 After install, run `ollama pull <model>`
 *   --skip-seed                   Do not seed demo SQLite data
 *   --help                        Show this help
 */
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_NODE_MAJOR = 20;
const MODES = new Set(["sovereign", "ollama", "openai_compatible"]);

function printHelp() {
  console.log(`
FLO installer — requirements
  • Node.js ${MIN_NODE_MAJOR}+ (LTS recommended)
  • npm 10+ (ships with Node)
  • Git
  • macOS, Linux, or Windows (WSL2 recommended on Windows)
  • Disk ~500 MB for node_modules + SQLite
  • Optional: Ollama (https://ollama.com/download) for local LLM
  • Optional: OpenAI-compatible API key for cloud LLM
  • Optional: Google Maps API keys for live traffic (see .env.example)

Usage
  npm run install:flo
  npm run install:flo -- --yes
  npm run install:flo -- --yes --mode=ollama --pull-ollama
  npm run install:flo -- --yes --mode=openai_compatible --api-key=sk-… --base-url=https://api.openai.com/v1 --model=gpt-4o-mini
`);
}

function parseArgs(argv) {
  const opts = {
    yes: false,
    help: false,
    mode: null,
    baseUrl: null,
    model: null,
    apiKey: null,
    pullOllama: false,
    skipSeed: false,
  };

  for (const raw of argv) {
    if (raw === "--yes" || raw === "-y") opts.yes = true;
    else if (raw === "--help" || raw === "-h") opts.help = true;
    else if (raw === "--pull-ollama") opts.pullOllama = true;
    else if (raw === "--skip-seed") opts.skipSeed = true;
    else if (raw.startsWith("--mode=")) opts.mode = raw.slice("--mode=".length);
    else if (raw.startsWith("--base-url=")) opts.baseUrl = raw.slice("--base-url=".length);
    else if (raw.startsWith("--model=")) opts.model = raw.slice("--model=".length);
    else if (raw.startsWith("--api-key=")) opts.apiKey = raw.slice("--api-key=".length);
    else {
      console.error(`Unknown option: ${raw}`);
      printHelp();
      process.exit(1);
    }
  }
  return opts;
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...opts,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(" ")}`);
  }
}

function which(bin) {
  const probe = process.platform === "win32" ? "where" : "which";
  const result = spawnSync(probe, [bin], { encoding: "utf8" });
  return result.status === 0;
}

async function ask(rl, question, fallback = "") {
  const hint = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${question}${hint}: `)).trim();
  return answer || fallback;
}

function checkRequirements() {
  console.log("Checking requirements…");
  const major = Number(process.versions.node.split(".")[0]);
  if (!Number.isFinite(major) || major < MIN_NODE_MAJOR) {
    console.error(
      `✗ Node.js ${MIN_NODE_MAJOR}+ is required (found ${process.versions.node}).`
    );
    console.error("  Install: https://nodejs.org/ (LTS)");
    process.exit(1);
  }
  console.log(`✓ Node ${process.versions.node}`);

  if (!which("npm")) {
    console.error("✗ npm not found on PATH");
    process.exit(1);
  }
  const npmV = spawnSync("npm", ["-v"], { encoding: "utf8" });
  console.log(`✓ npm ${(npmV.stdout || "").trim() || "ok"}`);

  if (!which("git")) {
    console.warn("! git not found — clone/update from GitHub will need Git installed");
  } else {
    console.log("✓ git");
  }

  if (which("ollama")) {
    console.log("✓ ollama (optional local LLM)");
  } else {
    console.log("· ollama not installed (optional — https://ollama.com/download)");
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  console.log("\nFLO — Fab Logistics Operations installer\n");
  checkRequirements();

  let mode = "sovereign";
  let aiBaseUrl = "";
  let aiModel = "";
  let aiApiKey = "";
  let pullOllama = opts.pullOllama;
  let skipSeed = opts.skipSeed;

  if (opts.yes) {
    mode = opts.mode || "sovereign";
    if (!MODES.has(mode)) {
      console.error(`Invalid --mode=${mode}`);
      process.exit(1);
    }
    if (mode === "ollama") {
      aiBaseUrl = opts.baseUrl || "http://127.0.0.1:11434/v1";
      aiModel = opts.model || "llama3.2";
      aiApiKey = "ollama";
      if (pullOllama && !which("ollama")) {
        console.warn(
          "! --pull-ollama requested but ollama is not on PATH — skipping pull"
        );
        pullOllama = false;
      }
    } else if (mode === "openai_compatible") {
      aiBaseUrl = opts.baseUrl || "https://api.openai.com/v1";
      aiModel = opts.model || "gpt-4o-mini";
      aiApiKey = opts.apiKey || "";
      if (!aiApiKey) {
        console.error(
          "openai_compatible mode requires --api-key=… when using --yes"
        );
        process.exit(1);
      }
    }
    console.log(
      `\nAutomated install: mode=${mode}` +
        (mode !== "sovereign" ? ` model=${aiModel}` : "") +
        (skipSeed ? " skip-seed" : "")
    );
  } else {
    const rl = createInterface({ input, output });

    console.log("\nChoose default AI mode for .env.local bootstrap:");
    console.log("  1) sovereign — in-process helper only (recommended default)");
    console.log("  2) ollama    — local Ollama at http://127.0.0.1:11434/v1");
    console.log(
      "  3) openai_compatible — cloud / self-hosted OpenAI-compatible API"
    );
    const modeChoice = await ask(rl, "Mode (1/2/3)", "1");

    if (modeChoice === "2") mode = "ollama";
    if (modeChoice === "3") mode = "openai_compatible";

    if (mode === "ollama") {
      aiBaseUrl = await ask(
        rl,
        "Ollama OpenAI base URL",
        "http://127.0.0.1:11434/v1"
      );
      aiModel = await ask(rl, "Ollama model", "llama3.2");
      aiApiKey = "ollama";

      if (which("ollama")) {
        console.log("✓ ollama found on PATH");
        const doPull = await ask(rl, `Pull model "${aiModel}" now? (y/N)`, "N");
        pullOllama = /^y(es)?$/i.test(doPull);
      } else {
        console.log(
          "! ollama not found. Install from https://ollama.com/download then run: ollama pull " +
            aiModel
        );
      }
    } else if (mode === "openai_compatible") {
      aiBaseUrl = await ask(
        rl,
        "API base URL (…/v1)",
        "https://api.openai.com/v1"
      );
      aiModel = await ask(rl, "Model id", "gpt-4o-mini");
      aiApiKey = await ask(rl, "API key");
      if (!aiApiKey) {
        console.error("API key is required for openai_compatible mode.");
        process.exit(1);
      }
    }

    skipSeed = /^y(es)?$/i.test(await ask(rl, "Skip database seed? (y/N)", "N"));
    rl.close();
  }

  const sessionSecret = randomBytes(32).toString("hex");
  const envLines = [
    "# Generated by npm run install:flo",
    `FLO_SESSION_SECRET=${sessionSecret}`,
    "DATABASE_URL=file:./dev.db",
  ];

  if (mode === "ollama" || mode === "openai_compatible") {
    envLines.push("AI_ALLOW_EXTERNAL=true");
    envLines.push(`AI_API_KEY=${aiApiKey}`);
    envLines.push(`AI_BASE_URL=${aiBaseUrl}`);
    envLines.push(`AI_MODEL=${aiModel}`);
  } else {
    envLines.push("# AI_ALLOW_EXTERNAL=true");
    envLines.push("# AI_API_KEY=");
    envLines.push("# AI_BASE_URL=");
    envLines.push("# AI_MODEL=");
  }

  if (skipSeed) {
    envLines.push("SKIP_SEED=true");
  }

  const envPath = join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    console.log(
      `\n.env.local already exists — writing ${envPath}.bak and replacing.`
    );
    writeFileSync(`${envPath}.bak`, readFileSync(envPath));
  }
  writeFileSync(envPath, `${envLines.join("\n")}\n`, "utf8");
  console.log(`✓ Wrote ${envPath}`);

  if (pullOllama && aiModel) {
    console.log(`\n→ ollama pull ${aiModel}`);
    run("ollama", ["pull", aiModel]);
  }

  console.log("\n→ npm ci");
  run("npm", ["ci"]);

  console.log("\n→ npx prisma migrate deploy");
  run("npx", ["prisma", "migrate", "deploy"]);

  if (!skipSeed) {
    console.log("\n→ npm run db:seed");
    run("npm", ["run", "db:seed"]);
  } else {
    console.log("\nSkipping seed (SKIP_SEED).");
  }

  console.log(`
Done.

Next:
  npm run dev
  open http://localhost:3000/login  (admin@flo.demo / demo1234)
  configure AI at /ai/settings (SQLite overrides this .env.local bootstrap)

Docs: SECURITY.md · README.md
`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
