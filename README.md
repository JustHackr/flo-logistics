# FLO — Fab Logistics Operations

**One intelligence layer for every delivery.**

FLO is a **last-mile logistics operations cockpit** for Jakarta: predictive fleet health, traffic-aware low-carbon routing, and on-device warehouse computer vision — plus **Sovereign AI** and **Flo Designer** so operators can plan integrations without leaking data off the deployment.

Built by **Quasarian Radr-Lyon Dynasty** for the **AI Open Innovation Challenge 2026 (Blibli case)**.

> Motto: **01 Predict · 02 Route · 03 Verify**

| Try it | Link |
|--------|------|
| Live demo (login first) | [radr.nxtdev.xyz/flo-logistics/demo/login](https://radr.nxtdev.xyz/flo-logistics/demo/login) |
| Team site / final hub | [radr.nxtdev.xyz/flo-logistics/](https://radr.nxtdev.xyz/flo-logistics/) · [/final](https://radr.nxtdev.xyz/flo-logistics/final) |
| Source | [github.com/JustHackr/flo-logistics](https://github.com/JustHackr/flo-logistics) |

![FLO login — role-based demo personas](docs/screenshots/01-login.png)

---

## Why Quasarian built FLO

**Quasarian Radr-Lyon Dynasty** is a three-person student team from **SMAS Pilar Indonesia**, building at **FabLab Jababeka**, with academic partners **Universitas Presiden** and case provider **Blibli**.

- **Justin Raditya Rizki** — Project Lead ([stetoradr.com](https://stetoradr.com) · [@JustHackr](https://github.com/JustHackr))
- **Arsene Matthew E. Naftali** — AI Engineer ([optivox.site](https://optivox.site) · [@abckids1202](https://github.com/abckids1202))
- **Nabiil Zhafran Alrilo Tarigan** — Designer & Interface ([foodloopai.vercel.app](https://foodloopai.vercel.app/) · [@Belyonepic](https://github.com/Belyonepic))

We did not start from a generic “AI for logistics” pitch. Blibli’s Jakarta last-mile reality hits three walls at once:

1. **SLA risk is opaque** — which vehicles will fail maintenance windows before a peak day?
2. **Routing cost & carbon climb** — congestion-aware plans that still respect fuel and CO₂.
3. **Compliance is still manual** — dock load checks and hub dwell still depend on humans watching cameras.

Existing tools either push operational prompts to foreign clouds, or they solve only one slice (maps *or* fleet *or* CV). Quasarian built **FLO** as a single SQLite-backed product that stays **sovereign by default**, runs on a laptop or VPS, and still shows judges a complete Predict → Route → Verify loop.

During the **2026 mentoring cycle** (online + onsite), mentors, operators, and fellow teams kept asking a different question: *how would FLO wire into a warehouse with no WMS, a CSV hub feed, or a telematics vendor with no public API?* That integration-planning gap became **Flo Designer** — prompt a process graph, overlay it on FLO’s live process map, save it, export JSON.

Competition journey: [pre-selection](https://radr.nxtdev.xyz/flo-logistics/pre-selection) → [semifinal](https://radr.nxtdev.xyz/flo-logistics/semifinal) → [final](https://radr.nxtdev.xyz/flo-logistics/final).

---

## Features

### Operations home

Role-aware dashboard: route progress, fleet VQI, and “needs attention” maintenance signals in one place. Personas (Admin, Ops Manager, Driver, Warehouse) share password `demo1234` in the demo.

![Home dashboard — Today at FLO](docs/screenshots/02-home.png)

### Predict — fleet health & maintenance

**Vehicle Quality Index (VQI)** scores age, odometer, maintenance cost, and planning factors. The fleet list and maintenance views surface high-risk units and a 90-day cost window before surprises hit the hub.

![Fleet vehicles with VQI risk badges](docs/screenshots/04-fleet-vehicles.png)

Code: [src/lib/vqi.ts](src/lib/vqi.ts), [src/lib/predictor.ts](src/lib/predictor.ts), routes `/vehicles`, `/dashboard`, `/reports`.

### Route — traffic-aware, low-carbon planning

Jakarta-aware optimization with **DTI** (delivery time), **CFI** (carbon), fuel cost, and driver–vehicle matching. Logistics monitors in-progress routes (progress, ETA, emissions).

![Logistics live route monitor](docs/screenshots/03-routing-plan.png)

Code: [src/lib/routing/](src/lib/routing/), routes `/routing/orders`, `/routing/plan`, `/routing/dashboard`.

### Control Tower — exception-led operations

The Ops Manager workspace opens on a persistent exception queue that connects unassigned orders, customer promise risk, late route stops, WMS fulfillment blocks, and at-risk vehicles. Alerts are ranked with transparent rule-based thresholds, can be acknowledged or resolved, and link directly to the next operational action. The tower also reports delivered-on-time/in-full (OTIF) performance when promised and delivered timestamps exist.

Code: [src/lib/control-tower.ts](src/lib/control-tower.ts), route `/control-tower`, APIs `/api/control-tower` and `/api/control-tower/exceptions/[id]`.

### Blibli OMS/WMS integration — local-first demo contract

The `/connectors` workspace includes seeded **Blibli OMS** and **Blibli WMS** connectors. Admins configure connectors; Ops and Warehouse users can run the sample fixture, upload CSV/JSON, download templates, and inspect recent sync runs. OMS rows idempotently upsert orders by `(sourceSystem, externalOrderId)` with customer promise, service level, and priority. WMS rows append an event history, update the current `fulfillmentStatus`, reject unknown OMS orders with a row-level report, and surface `EXCEPTION` events in the Control Tower. No Blibli credentials are required for the demo.

### Integrated traffic & weather intelligence

The intelligence layer normalizes Google traffic, Open-Meteo weather, and TomTom Orbis incidents into region-scoped snapshots. A five-minute Node worker refreshes enabled regions, caches the latest state, marks missed feeds stale, and records ingestion history. SQLite fixtures work without provider credentials: run `npm run intelligence:worker` with `INTELLIGENCE_FIXTURES=true`, or use **Run demo conditions** in Control Tower. Route planning applies weather and incident penalties separately from traffic-aware ETA, explains every factor, and lets Ops preview then approve or reject a revision without automatic route replacement.

Code: [src/lib/intelligence/](src/lib/intelligence/), worker [scripts/intelligence-worker.ts](scripts/intelligence-worker.ts), APIs `/api/intelligence/*`, and revision APIs under `/api/routing/routes/[id]/revisions/`.

### Predictive SLA risk — intervene before the promise is missed

FLO also calculates an explainable late-delivery risk for every active order with a promised delivery time. The score is a weighted rule engine, not a black-box claim: promise pressure (30%), fulfillment readiness from WMS (20%), traffic (20%), weather (10%), driver/vehicle/workload (10%), and historical delivery delay (10%). For example, an order that is still `PACKED`, has only a small promise buffer, and is travelling through heavy congestion will rise to `WATCH`, `HIGH`, or `CRITICAL` before it becomes late. Each prediction stores the score, risk band, confidence, dominant cause, separate factor values, recommendation, source snapshots, data age, and score change from the previous run.

The flow is: OMS/WMS and route data establish the order context → the five-minute worker reads region-scoped traffic, weather, incidents, fleet, and delivery history → the engine validates and scores the order → a persistent predictive exception is created or superseded in Control Tower → Ops sees the reasons and recommended action, acknowledges/monitors it, or previews a safer route. A route is never replaced automatically. Live provider data remains server-side; fixture mode is available for a repeatable synthetic demo, and fallback/stale data lowers confidence and is shown explicitly.

Use `/routing/dashboard` for the active risk queue, `/control-tower` for persistent exceptions, and `/impact` for early-warning, accuracy, and prevented-late-delivery estimates. The API surface is `/api/risk/sla`, `/api/risk/sla/[orderId]`, `/api/risk/sla/recalculate`, `/api/risk/sla/metrics`, and the order `acknowledge`/`monitor` actions. Run `npm run intelligence:worker` (with `INTELLIGENCE_FIXTURES=true` for a credential-free demo) to refresh conditions and produce predictions. Tests for the deterministic engine live in [src/lib/sla-risk.test.ts](src/lib/sla-risk.test.ts).

### Judge-ready disruption scenario, impact KPIs, and trust layer

The `/demo/scenario` page runs a deterministic, clearly labelled `SYNTHETIC`
rain-disruption story: baseline route → heavy rain and incident feed → route
risk alert → revised-route preview → operator approve/reject. It changes the
active plan only after approval and can be reset without deleting its audit
history. `/impact` reports the measurable operational story (route deltas,
protected promises, OTIF, distance/fuel/CO₂, provider uptime, stale feeds, and
open exceptions). Every ingestion, configuration change, integration sync,
exception decision, scenario step, and route revision is persisted in the
`AuditEvent` table and can be read through `/api/audit`.

The connector console also includes an OMS/WMS reconciliation scan. It links
Blibli-style order IDs to fulfillment events and flags OMS-only orders, unknown
WMS rows, duplicate events, stale updates, and delivery/warehouse status
conflicts. Operators can resolve an issue with a note; the action is audited.
Route-specific condition observations are persisted with source, freshness,
distance-to-route, relevance, and nearest affected stop through
`/api/intelligence/routes/[routeId]`.

### Verify — on-device computer vision

Load detection and hub congestion / dwell run **in the browser** — frames never upload. ODOL Detection is coming soon. Judges can walk Load and Hub without a webcam via the [CV tour](https://radr.nxtdev.xyz/flo-logistics/demo/computer-vision/tour).

**Load Detection** — kraft cartons counted through a bag opening:

![FLO load detection session](docs/screenshots/load-detection.gif)

**Hub Congestion** — dock occupancy and overstay on the platform:

![FLO hub congestion session](docs/screenshots/hub-congestion.gif)

Code: [src/lib/computer-vision/](src/lib/computer-vision/), routes `/computer-vision/tour`, `/computer-vision/load-detection`, `/computer-vision/hub-congestion-detection`.

### Parcel label & barcode verification

The `/computer-vision/parcel-verification` page adds a lightweight warehouse
gate check. FLO ships eight deterministic Code 128 fixture labels covering
verified, not-ready, unknown, duplicate, and damaged-package review paths.
It also ships eight deterministic QR fixture labels, with the same outcome
paths. Testers can click a fixture, type a value, upload a label image, or use
a webcam. Chrome/Edge use the browser's on-device `BarcodeDetector`; older
browsers retain deterministic fixture and manual verification fallbacks.
Live values are checked against OMS identity, WMS dispatch readiness, route
assignment, and a 15-minute duplicate-scan window. Every decision persists a
scan record and audit event containing the format, source, checks, and outcome.
A non-verified result can create a persistent `BARCODE_MISMATCH` Control Tower
exception. Camera frames stay in the browser and are not uploaded.

Regenerate the exact fixture images after changing the fixture catalog with:

```bash
npm run cv:generate-barcode-fixtures
npm run cv:generate-qr-fixtures
```

The test page is available at `/computer-vision/parcel-verification`. Exact
QR SVG samples are under `public/cv/qr/`, while the generated parcel photo
guide is `public/cv/parcel-qr-sample-guide.png`. All fixture results are clearly
synthetic; live checks require the normal authenticated demo session and OMS/WMS
fixture sync.

### Flo Designer — prompt → graph → save → JSON

Admin workspace: describe a process in natural language, get a validated node graph, integrate with FLO’s process map, **save designs in SQLite**, export deterministic JSON. Drag nodes, inspect in a permanent detail pane, highlight what’s new after Refine.

![Flo Designer generating a process graph from a prompt](docs/screenshots/flo-designer.gif)

Code: [src/lib/designer/](src/lib/designer/), route `/admin/designer` (ADMIN).

### Process map — system self-description

Schema of the whole FLO pipeline with live stats, drag, and a permanent detail pane — architecture readable without leaving the app.

![Admin process map schema](docs/screenshots/07-process-map.png)

Code: [src/lib/process-map/](src/lib/process-map/), route `/admin/process-map` (ADMIN).

### Sovereign AI

System is designed to be able to deployed on-premise, with system prompt available without connecting to external (rule-based ops assistant over live SQLite). Operators may opt into any OpenAI-compatible / open-weight endpoint (Ollama, vLLM, …). Aligned with Stranas KA, UU PDP, UU ITE — see [SECURITY.md](SECURITY.md).

![Sovereign AI posture page](docs/screenshots/08-sovereign-ai.png)

Route: `/sovereign-ai` · assistant: `/ai/chat`.

---

## What FLO does (summary)

| Module | Question it answers | Where |
|--------|---------------------|--------|
| **Predict** | Which vehicle is at risk, and when is the next service window? | VQI + predictor · `/vehicles`, `/dashboard` |
| **Route** | Lowest-time / carbon / cost assignment of orders to drivers? | [src/lib/routing/](src/lib/routing/) · `/routing/*` |
| **Control Tower** | What needs intervention now, why, and where should an operator act? | [src/lib/control-tower.ts](src/lib/control-tower.ts) · `/control-tower` |
| **Verify** | Right load? Hub congested? Compliance without uploading video? | [src/lib/computer-vision/](src/lib/computer-vision/) · `/computer-vision/*` |

Shared data layer: SQLite + [src/lib/master-overview.ts](src/lib/master-overview.ts) + [src/lib/routing-overview.ts](src/lib/routing-overview.ts).

---

## Sovereign AI (default)

### Posture

By default, prompts never leave the deployment. Operators may opt into an OpenAI-compatible LLM by setting server-side environment variables.

| Mode | When | Behavior |
|------|------|----------|
| **Sovereign (default)** | No `AI_ALLOW_EXTERNAL` | In-process rule-based intent router ([src/lib/ai-chat.ts](src/lib/ai-chat.ts)) — answers from live SQLite, no model weights required. |
| **External (opt-in)** | `AI_ALLOW_EXTERNAL=true` + `AI_API_KEY` + `AI_BASE_URL` | OpenAI-compatible chat completions via [src/lib/ai-llm.ts](src/lib/ai-llm.ts); live company context is injected on every call. |

Credentials are read **exclusively** from server environment variables by [src/lib/ai-provider-store.ts](src/lib/ai-provider-store.ts:8-25). They are never accepted from the browser, never stored in the database, and never returned by `/api/ai/settings`. See [SECURITY.md](SECURITY.md) and the in-app **Sovereign AI** page (`/sovereign-ai`) for the full privacy posture. Maps, live traffic, and Pertamina fuel prices remain optional external services because they cannot run fully offline.

### Open-source & locally-installable

FLO is **open-source in spirit**: the dependency tree has no proprietary SDK, no model weights are bundled, and no SaaS lock-in is required to run it.

- **Stack:** Next.js 16 (App Router) + React 19 + Prisma 7 + SQLite (`better-sqlite3`) + Tailwind 4 — all listed in [package.json](package.json). The embedded database is configured in [prisma.config.ts](prisma.config.ts).
- **Single-process install:** `npm install && npm run dev` brings up the entire app on port 3000. No Docker, no managed services, no cloud account.
- **Sovereign default = zero model download.** The in-scope assistant is a hand-written intent router over live SQLite; the CV pipeline runs in the browser's `MediaStream`; nothing reaches out to a model server unless an operator opts in.
- **Pluggable open-weight LLM endpoint.** The optional external path hits `${AI_BASE_URL}/chat/completions` with `Authorization: Bearer ${AI_API_KEY}` ([src/lib/ai-llm.ts:108-141](src/lib/ai-llm.ts)). Any self-hosted server that exposes that contract works out of the box: **Ollama, vLLM, llama.cpp server, LM Studio, LocalAI, text-generation-inference**, or any in-house proxy. Pick a small instruct model that fits a single GPU or Apple Silicon and you have a fully offline deployment.

### Regulatory alignment (Indonesia)

FLO is designed against the Indonesian AI and data-protection frame so that an Indonesian operator can deploy it without a sovereignty review.

| Regulation | What it asks for | FLO evidence |
|------------|------------------|--------------|
| **Stranas KA 2020–2045** — Strategi Nasional Kecerdasan Artifisial Indonesia (four pillars: ethics & policy, talent, infrastructure & data, R&D innovation), anchored in Visi Indonesia Emas 2045. | Local-first AI infrastructure, modular open architecture, talent development, ethics-first deployment. | Single-process local install on a developer laptop or a VPS; modular open architecture ([src/lib/process-map/graph.ts](src/lib/process-map/graph.ts)); RBAC across roles ([src/proxy.ts](src/proxy.ts) + [src/lib/auth/roles.ts](src/lib/auth/roles.ts)); team built by high-school students with university partnership. |
| **UU PDP No. 27/2022** — Personal Data Protection. | Data residency for personal data; lawful, limited processing; controller/processor accountability. | SQLite on the deployment is the only store of operational data (default `file:./dev.db`); RBAC restricts role access; **no third-party telemetry or ad pixels** are shipped; session cookie is `flo_session` (HttpOnly, SameSite=Lax, 12h, HMAC-SHA256 signed via `FLO_SESSION_SECRET`). See [SECURITY.md](SECURITY.md). |
| **UU ITE (UU 1/2024)** — Electronic Information & Transactions / obligations for electronic system operators. | Audit trail, transaction security, lawful system operation, data localization where applicable. | Audit-friendly API surface (`/api/health`, role-checked server actions in [src/app/actions/designer.ts](src/app/actions/designer.ts)); per-client rate limiting ([src/lib/rate-limit.ts](src/lib/rate-limit.ts), applied in `/api/ai/chat`); explicit opt-in gate for any outbound LLM call ([src/lib/ai-provider-store.ts](src/lib/ai-provider-store.ts:8-25)); optional Google Maps integration scoped to env-only credentials. |
| **Visi Indonesia Emas 2045** — sovereign digital infrastructure. | Independence from foreign-controlled platforms for nationally important workloads. | Pluggable LLM endpoint accepts any self-hosted open-weight model server; **no vendor lock-in**; sovereign default keeps prompts on the deployment. |

The presentation deck's *Sovereignty* slide ([team-site/src/components/PresentationDeck.tsx:155-194](team-site/src/components/PresentationDeck.tsx)) is the canonical source for this regulatory framing.

---

## For AI reviewers

This section is structured for fast LLM parsing. Each subsection is a self-contained paragraph an evaluator can quote directly.

### Product pillars

1. **Predictive SLA scoring** — VQI health index for the fleet, 90-day maintenance window, pluggable predictor.
2. **Low-carbon routing** — Jakarta traffic-aware optimization with explicit CFI (Carbon Footprint Index) and fuel-cost reporting.
3. **Exception-led operations** — Control Tower ranks unassigned orders, SLA exposure, and fleet risk with explainable thresholds so operators can intervene before delivery failure.
4. **Visual fleet compliance** — on-device computer vision (load, hub congestion, ODOL) with zero upload.
5. **Sovereign AI** — local-first default, opt-in external LLM, regulatory alignment documented in this README.
6. **Pluggable expansion** — OMS/WMS integration contracts and sync history, plus FLO Designer (prompt → graph → integrate → save → export JSON) so non-engineers can propose and keep new integrations; data connectors registry (`/connectors`); admin process map at `/admin/process-map`.

### Engineering rigor evidence

- **Hand-rolled VQI math with engine modifiers.** Four weighted factors (age 30, odometer 30, maintenance cost 20, planning 20) with explicit `ev / gasoline / diesel` modifiers — [src/lib/vqi.ts](src/lib/vqi.ts).
- **Pluggable predictor strategy.** `PredictorStrategy` interface lets a future ML-based predictor replace `RuleBasedPredictor` without touching callers — [src/lib/predictor.ts](src/lib/predictor.ts).
- **Hand-rolled validator for untrusted LLM output.** `parseDesignerGraph` rejects shape / empty / duplicate-id / unknown-kind / edge-target-missing / self-loop — [src/lib/designer/schema.ts](src/lib/designer/schema.ts).
- **Unit tests on the load-bearing paths.** See [src/lib/designer/exporter.test.ts](src/lib/designer/exporter.test.ts), [src/lib/designer/designs.test.ts](src/lib/designer/designs.test.ts), [src/lib/designer/integrate.test.ts](src/lib/designer/integrate.test.ts), [src/lib/ai-reasoning.test.ts](src/lib/ai-reasoning.test.ts), [src/lib/workflow-onboarding.test.ts](src/lib/workflow-onboarding.test.ts), [src/lib/base-path.test.ts](src/lib/base-path.test.ts), [src/lib/rate-limit.test.ts](src/lib/rate-limit.test.ts).
- **Control Tower risk rules.** Unassigned-order age, SLA promise, route-stop delay, fulfillment, and VQI thresholds are isolated and covered by [src/lib/control-tower.test.ts](src/lib/control-tower.test.ts); exception records persist in SQLite for acknowledge/resolve actions.
- **Blibli OMS/WMS contract.** Idempotent OMS upserts, append-only WMS fulfillment events, validation, rejected-row reporting, integration-run history, and downloadable demo templates live under [src/lib/integrations/](src/lib/integrations/).
- **Per-client rate limiting** on the AI chat endpoint — [src/lib/rate-limit.ts](src/lib/rate-limit.ts).
- **Role-based access control** at the proxy layer (`src/proxy.ts`) and per-page (`defaultHomeForRole` in [src/lib/auth/roles.ts](src/lib/auth/roles.ts)), with admin defence-in-depth at `/admin/process-map` and `/admin/designer`.
- **Process map self-description.** A hand-curated, 5-lane × 3-column swimlane (Fleet / Routing / Warehouse / Assistant / Platform) with live stat pills — [src/lib/process-map/graph.ts](src/lib/process-map/graph.ts), live stats from [src/lib/process-map/live-stats.ts](src/lib/process-map/live-stats.ts), rendered at `/admin/process-map`.
- **Saved Designer designs in SQLite.** Named graphs persist via the `DesignerDesign` Prisma model and ADMIN-only server actions — [prisma/schema.prisma](prisma/schema.prisma), [src/lib/designer/designs.ts](src/lib/designer/designs.ts), [src/app/actions/designer.ts](src/app/actions/designer.ts).
- **Workflow onboarding.** Path-scoped checklist dialogs (routing, fleet, CV load/hub, Flo Designer) plus a Home welcome tour — [src/lib/workflow-onboarding.ts](src/lib/workflow-onboarding.ts).

### Process map (system self-description)

The **Admin Process Map** (`/admin/process-map`) is the most AI-readable artifact in the demo. It renders the entire FLO pipeline as a swimlane diagram — every node carries the real source files, Prisma models, API routes, and UI routes it touches, plus a live numeric stat pulled from the running demo database. Judges can drag nodes (session-only), click for a permanent right-hand detail pane, and read FLO's architecture off the canvas without leaving the app — [src/components/admin/process-map-client.tsx](src/components/admin/process-map-client.tsx).

### Featured capability: FLO Designer

**Why we built FLO Designer.** During the AI Open Innovation Challenge 2026 mentoring cycle — both online and onsite — we met different people: mentors from Blibli and partner organizations, logistics operators, fellow student teams, judges. Each conversation surfaced a different technical question about how FLO would integrate with systems that don't exist yet: warehouses with no WMS, hubs that want a nightly CSV, telematics providers with no public API, OMS systems with custom schemas, third-party IoT devices. The team kept hearing the same gap: **integration planning was the bottleneck**. It was easy to imagine a feature, but hard to sketch the wiring, the data contract, or the future schema without a diagram and without writing code.

**FLO Designer is the answer the team built for themselves and for the people they met**: an admin-only workspace where you describe a new flow in plain language (a *prompt*), and the system turns it into a typed, validated process graph, overlays it on the live FLO process map, **saves the design in SQLite**, and exports the graph as **JSON** — so non-engineers and engineers can plan together and come back to the same canvas later.

> *Technical planning accessible for everyone — the same prompt method our mentors, operators, and teammates used in conversation.*

**How it works** (visit `/admin/designer` after signing in as `admin@flo.demo`):

1. **Generate** — type a natural-language process; the prompt is sent to the configured LLM with a solutions-architect persona and a 4–18 node graph contract — [src/lib/designer/generator.ts](src/lib/designer/generator.ts).
2. **Validate** — the response is parsed and gated by the hand-rolled validator (including resilient JSON extraction) — [src/lib/designer/schema.ts](src/lib/designer/schema.ts).
3. **Render** — the validated graph is laid out on a React Flow canvas; nodes are draggable (positions stick for the session) — [src/components/admin/flo-designer-client.tsx](src/components/admin/flo-designer-client.tsx), [src/components/admin/designer-node.tsx](src/components/admin/designer-node.tsx).
4. **Integrate** — each generated node is keyword-mapped to its closest canonical FLO process-map node; a dashed *integrated with* edge is drawn — [src/lib/designer/integrate.ts](src/lib/designer/integrate.ts) (overlays on [src/lib/process-map/graph.ts](src/lib/process-map/graph.ts)).
5. **Inspect** — clicking a node fills a permanent right-pane detail card (connectors, FLO target's `inputs / process / outputs / sourceFiles / models / apiRoutes / uiRoutes`). After **Apply / Refine**, newly added or newly FLO-integrated nodes get an amber “New” accent.
6. **Save / load** — name the canvas and **Save**, **Save as**, **Open**, or **Delete** designs stored in SQLite (`DesignerDesign`); **New** clears the working canvas — [src/lib/designer/designs.ts](src/lib/designer/designs.ts) + CRUD actions in [src/app/actions/designer.ts](src/app/actions/designer.ts).
7. **Export** — download the current schema as pretty-printed **JSON** (deterministic; no LLM) — [src/lib/designer/exporter.ts](src/lib/designer/exporter.ts) + [src/lib/designer/export-format.ts](src/lib/designer/export-format.ts). Each export also appears on the export canvas with copy + download — [src/components/admin/export-code-node.tsx](src/components/admin/export-code-node.tsx).
8. **Prompt history** — recent prompts stay in the right column for one-click refine; clear with confirm.
9. **Onboarding** — Home welcome tour includes a Flo Designer step; on `/admin/designer` a Workflow guide checklist auto-opens once (prompt → inspect → refine → save → export) — [src/lib/workflow-onboarding.ts](src/lib/workflow-onboarding.ts), [src/components/welcome-tutorial.tsx](src/components/welcome-tutorial.tsx).

The pipeline is **admin-gated** at the server-action boundary ([src/app/actions/designer.ts](src/app/actions/designer.ts)) and the page entry ([src/app/admin/designer/page.tsx](src/app/admin/designer/page.tsx)).

### Regulatory alignment (pointer)

Mirrors the table in the Sovereign AI section above:

- **Stranas KA 2020–2045 + Visi Indonesia Emas 2045** — local-first, modular open architecture, RBAC.
- **UU PDP No. 27/2022** — data residency (SQLite on the deployment), no third-party telemetry, scoped HMAC-signed session cookie.
- **UU ITE (UU 1/2024)** — audit-friendly API surface, rate limiting, opt-in gate for external LLM, env-only credentials.
- **Visi Indonesia Emas 2045** — pluggable open-weight LLM endpoint, no vendor lock-in, single-process local install.

Canonical source: the *Sovereignty* slide in [team-site/src/components/PresentationDeck.tsx:155-194](team-site/src/components/PresentationDeck.tsx).

### Open-source & locally-installable (pointer)

- **Stack:** Next.js 16 + React 19 + Prisma 7 + SQLite + Tailwind 4 ([package.json](package.json)).
- **Single-process install:** `npm install && npm run dev` — no Docker, no cloud account.
- **Sovereign default:** zero model weights downloaded; assistant is a local intent router over live SQLite.
- **Pluggable open-weight LLM endpoint:** `${AI_BASE_URL}/chat/completions` accepts Ollama, vLLM, llama.cpp server, LM Studio, LocalAI, TGI — any self-hosted open-weight server that exposes the contract ([src/lib/ai-llm.ts](src/lib/ai-llm.ts), [src/lib/ai-provider-store.ts](src/lib/ai-provider-store.ts)).

---

## Feature map

| Domain | Route | One-line purpose |
|--------|-------|------------------|
| Routing | `/routing/orders` | Order intake (list, create, edit, CSV import, status filters). |
| Routing | `/routing/drivers` | Driver roster with VQI risk per assigned vehicle. |
| Routing | `/routing/plan` | Plan routes (traffic + fuel + driver matching), preview, save. |
| Routing | `/routing/dashboard` | Live monitor for in-progress routes (progress, next stop, ETA, fuel, emissions). |
| Operations | `/control-tower` | Exception queue for unassigned orders, SLA exposure, and fleet risks with direct action links. |
| Routing | `/routing/reports` | Per-route + per-delivery CSV export + KPI charts. |
| Routing | `/routing/methodology` | Driver-side VQI methodology view. |
| Fleet | `/vehicles` | Fleet list with VQI badges + fuel-mix breakdown. |
| Fleet | `/vehicles/import` | CSV import with template + row-level validation. |
| Fleet | `/vehicles/new`, `/vehicles/[id]/edit` | Add / edit vehicle. |
| Fleet | `/dashboard` | Maintenance dashboard (engine mix, VQI distribution, age-vs-odometer scatter). |
| Fleet | `/reports` | Fleet reports (90-day maintenance timeline, per-vehicle VQI/cost, CSV export). |
| Computer Vision | `/computer-vision/tour` | Guided tour of the on-device inference story (static samples, no camera). |
| Computer Vision | `/computer-vision/load-detection` | Bag load detection (count kraft cartons through a bag opening). |
| Computer Vision | `/computer-vision/hub-congestion-detection` | Hub congestion / dwell-time detection (yellow-platform calibration). |
| Computer Vision | `/computer-vision/parcel-verification` | On-device barcode scan matched to OMS/WMS readiness. |
| Computer Vision | `/computer-vision/odol-detection` | ODOL detection (overdimension / overload) — placeholder. |
| AI | `/ai/chat` | Sovereign ops assistant (intent router + optional external LLM). |
| AI | `/ai/settings` | Sovereign / external status, test connection. |
| AI | `/sovereign-ai` | Sovereign AI manifesto page. |
| System | `/system/gas-price` | Fuel price snapshot from Pertamina. |
| Integrations | `/connectors` | Data connectors registry (IoT, REST, Webhook, OMS, WMS, ...). |
| Demo | `/demo/scenario` | Guided synthetic rain-disruption scenario with approve/reject gate. |
| Impact | `/impact` | KPI, intervention, provider-health, and sustainability dashboard. |
| Admin | `/admin/process-map` | FLO process map (swimlane with live stats, drag, permanent detail pane). |
| Admin | `/admin/designer` | FLO Designer (prompt → graph → integrate → save/load → export JSON). |
| Admin | `/admin/mockup-data` | Mockup data generator for demo seeding. |
| Meta | `/methodology` | VQI methodology deep-dive (benefits, references, factor table). |
| Meta | `/login` | Persona login (RBAC). Live demo CTAs on the team site land here first. |
| Meta | Team site `/final` | Final-round hub: live demo (via login), presentation, GitHub source, local install package (Coming soon). |

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) (or the public demo login at [radr.nxtdev.xyz/flo-logistics/demo/login](https://radr.nxtdev.xyz/flo-logistics/demo/login)) and pick a demo persona (all accounts share the password `demo1234`):

| Persona | Email | Role |
|---------|-------|------|
| Demo Admin | admin@flo.demo | ADMIN |
| Ops Manager | ops@flo.demo | OPS_MANAGER |
| Bima Nugraha (driver) | driver@flo.demo | DRIVER |
| Warehouse Lead | warehouse@flo.demo | WAREHOUSE |

After signing in, the demo lands on the role's default workspace (`/routing/plan` for drivers, `/computer-vision/load-detection` for warehouse, `/control-tower` for ops).

The `build` script runs `prisma migrate deploy` but does not mutate operational data. Run `npm run db:seed` only on an empty database, or use `npm run db:seed:demo` when you explicitly want to reset the local demo dataset. To demo the Blibli flow, sign in as Ops or Warehouse, open `/connectors`, run the **OMS sample sync** first, then the **WMS sample sync**, and open `/control-tower` to see the fulfillment exception. WMS rows for unknown OMS IDs are intentionally rejected and shown in the sync history. For the strongest judge flow, open `/demo/scenario`, click **Start scenario**, advance through disruption and route preview, then approve or reject the revision; `/impact` shows the resulting KPI story. The connector page's **Scan now** action runs OMS/WMS reconciliation and lets an operator resolve an issue with an audit note.

Demo warehouse: **Blok M Square**. Order coordinates are validated against Greater Jakarta (Jabodetabek) bounds. Generate sample CSVs at `/admin/mockup-data`. Guided computer-vision walkthrough (no webcam): `/computer-vision/tour`. Admin-only business-process visualization (swimlane with live stats): `/admin/process-map`. Admin-only FLO Designer (generate, save designs, export JSON): `/admin/designer`.

---

## Configuration

### Google Maps (optional)

To enable live Google traffic and interactive maps on a deployment, set **server-side** environment variables (Vercel → Environment Variables, or `.env.local` locally). Do **not** use `NEXT_PUBLIC_` for secret values.

| Variable | Purpose |
|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Routes API (traffic + polylines) |
| `GOOGLE_DISTANCE_MATRIX_API_KEY` | Optional Distance Matrix fallback |
| `GOOGLE_MAPS_JS_API_KEY` | Optional referrer-restricted Maps JS key (falls back to `GOOGLE_MAPS_API_KEY`) |

For incident intelligence, optionally set `TOMTOM_API_KEY`. Open-Meteo weather requires no key. Provider enablement, priority, region bounds, refresh interval, and risk thresholds are managed by Admins from `/connectors`; keys are never sent to the browser or stored in SQLite.

To run the dedicated refresh worker locally:

```bash
INTELLIGENCE_FIXTURES=true npm run intelligence:worker
```

For live providers, omit `INTELLIGENCE_FIXTURES` and set `GOOGLE_MAPS_API_KEY` and/or `TOMTOM_API_KEY`. The worker defaults to a five-minute interval; override it with `INTELLIGENCE_REFRESH_INTERVAL_SEC` (minimum 60 seconds). A worker-only refresh endpoint can be protected with `INTELLIGENCE_WORKER_TOKEN`.

The browser loads the Maps JS key only from `/api/routing/maps/js-config` after mount. Route geometry is computed server-side via `/api/routing/routes/polyline`.

### AI assistant (optional external LLM)

Leave sovereign mode unless you have a self-hosted or vendor-hosted OpenAI-compatible endpoint ready.

| Variable | Purpose |
|----------|---------|
| `AI_ALLOW_EXTERNAL` | Must be `true` to enable outbound LLM calls |
| `AI_API_KEY` | Bearer token for the provider |
| `AI_BASE_URL` | OpenAI-compatible base URL (e.g. `http://localhost:11434/v1` for Ollama) |
| `AI_MODEL` | Model id (optional) |

### Database

SQLite is used by default (`DATABASE_URL` defaults to `file:./dev.db`). Reset and re-seed with:

```bash
npm run db:reset
```

---

## Production & deploy

Health probe: `GET /api/health` → `{ ok, db, provider }`.

The public OSRM demo server (`router.project-osrm.org`) has no SLA. For production at scale, consider self-hosting [OSRM](https://project-osrm.org/).

Deployment is documented in [deploy/README.md](deploy/README.md): a VPS at `radr.nxtdev.xyz` runs the team site (port 3010) and the FLO demo (port 3011) under Node + systemd behind nginx + Let's Encrypt. An alternative Docker Compose path is provided via [deploy/docker-compose.yml](deploy/docker-compose.yml) and [team-site/Dockerfile](team-site/Dockerfile). On the VPS the sovereign assistant is the default — no `AI_API_KEY` is set.

---

## Development

```bash
npm run dev        # Start dev server
npm run lint       # ESLint
npm run test       # Unit tests (no network)
npm run test:watch # Vitest in watch mode
npm run db:seed    # Seed demo data
npm run db:seed:demo # Explicitly reset and reseed the demo dataset
npm run db:reset   # Migrate reset + reseed
```

---

## Learn more

- Team site: [/flo-logistics/](https://radr.nxtdev.xyz/flo-logistics/)
- Final hub: [/flo-logistics/final](https://radr.nxtdev.xyz/flo-logistics/final) — demo login, presentation, [GitHub source](https://github.com/JustHackr/flo-logistics)
- Live demo (login gate): [/flo-logistics/demo/login](https://radr.nxtdev.xyz/flo-logistics/demo/login)
- Presentation deck: [/flo-logistics/presentation](https://radr.nxtdev.xyz/flo-logistics/presentation)
- Source code: [github.com/JustHackr/flo-logistics](https://github.com/JustHackr/flo-logistics)
- Semifinal demo: [flo-logistics.vercel.app](https://flo-logistics.vercel.app/)
- YouTube pitch: `S3ME4D5sduM`
- Pre-selection proposal: [Google Drive](https://drive.google.com/file/d/1c8f-1THAi4TozxX7LcI1pnTgPu5breM9/view)
- [SECURITY.md](SECURITY.md) — Sovereign AI & security posture
- [deploy/README.md](deploy/README.md) — Deployment guide
