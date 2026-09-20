# Security & Sovereign AI posture

FLO (Fab Logistics Operations) is designed **sovereign by default**: operational
data and assistant prompts stay on the deployment unless an operator explicitly
opts into a third-party service that cannot run locally.

## What we store

| Data | Where | Notes |
|------|-------|-------|
| Vehicles, drivers, orders, route plans | SQLite (`DATABASE_URL`, default `file:./dev.db`) | Seeded demo data on first deploy |
| Demo users (4 seeded personas) | SQLite `User` table | Hashed with scrypt + 16-byte salt (`src/lib/auth/password.ts`); passwords are `demo1234` for the seeded personas only |
| Session cookie | `flo_session` (`src/lib/auth/session-token.ts`) | HttpOnly, SameSite=Lax, 12 h; signed with HMAC-SHA256 using `FLO_SESSION_SECRET` (fallback dev secret if unset) |
| Locale preference | `flo_locale` cookie (`src/proxy.ts`) | SameSite=Lax; no tracking IDs |
| Chat history | Browser `localStorage` | Client-only; not uploaded |
| CV session summaries | Browser `localStorage` | Client-only |
| AI provider config | SQLite `AiProviderConfig` (singleton) | ADMIN-saved mode, base URL, model, and optional API key; never returned to the browser |

## Demo access (RBAC)

The demo uses role-based access control on **pages and navigation**. Most
`/api/*` routes stay open for the live demo so the public can review the
system without holding accounts. **Exceptions:** `PUT /api/ai/settings` and
`POST /api/ai/test-connection` with a form body require an **ADMIN** session.

| Role | Persona | Sees |
|------|---------|------|
| `ADMIN` | admin@flo.demo | Everything (including `/admin/process-map`, `/admin/mockup-data`, and AI provider Save) |
| `OPS_MANAGER` | ops@flo.demo | Fleet, routing, reports, AI assistant, Sovereign AI, computer-vision tour |
| `DRIVER` | driver@flo.demo | `/routing/plan` and `/routing/dashboard` only |
| `WAREHOUSE` | warehouse@flo.demo | `/routing/orders` and `/computer-vision/*` |

`src/proxy.ts` redirects unauthenticated visitors to `/login?next=…` and sends
role-mismatched paths to each role's default home (`defaultHomeForRole` in
`src/lib/auth/roles.ts`).

We do **not** ship product analytics, ad pixels, or third-party telemetry SDKs.

## What the assistant does by default

The Company Assistant uses the in-process operations helper in
`src/lib/ai-chat.ts`. It answers from live SQLite snapshots. **No prompts are
sent to an outbound model** unless an ADMIN opts in via AI Settings, or the
server is bootstrapped with env vars (below).

### Modes (resolution order)

1. **SQLite `AiProviderConfig`** (ADMIN-saved at `/ai/settings`):
   - `sovereign` — in-process helper only
   - `ollama` — local OpenAI-compatible host (default `http://127.0.0.1:11434/v1`); no API key
   - `openai_compatible` — any `/v1` host with API key
2. Else **env bootstrap** when all are set:
   - `AI_ALLOW_EXTERNAL=true`
   - `AI_API_KEY`
   - `AI_BASE_URL` (OpenAI-compatible `/v1` host)
3. Else **sovereign**

`GET /api/ai/settings` returns status only (mode, model, host, `hasApiKey`,
`canEdit`). It never returns the API key. After the first ADMIN save, SQLite
wins over env for outbound routing.

## Optional external integrations

| Integration | Env / UI | Purpose |
|-------------|----------|---------|
| Google Maps / Routes | `GOOGLE_MAPS_API_KEY`, optional `GOOGLE_MAPS_JS_API_KEY` | Live traffic geometry + map UI |
| Pertamina fuel list | (none — public page fetch) | Regional fuel prices for cost estimates |
| Ollama (local) | AI Settings → Ollama, or installer | Local open-weight LLM |
| OpenAI-compatible LLM | AI Settings or `AI_ALLOW_EXTERNAL` + key + base URL | Optional richer NL answers |

Computer vision demos process webcam frames **on-device** in the browser. The
guided tour at `/computer-vision/tour` uses static sample frames so judges can
review the feature without camera permission.

## Local install

Laptop operators can run `npm run install:flo` after cloning. The wizard writes
`.env.local`, runs migrations, and optionally checks Ollama. See
`scripts/install.mjs`.

## Reporting

For security issues in this competition prototype, contact the Quasarian /
FLO team maintainers via the repository owners.
