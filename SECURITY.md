# Security & Sovereign AI posture

FLO (Fab Logistics Operations) is designed **sovereign by default**: operational
data and assistant prompts stay on the deployment unless an operator explicitly
opts into a third-party service that cannot run locally.

## What we store

| Data | Where | Notes |
|------|-------|-------|
| Vehicles, drivers, orders, route plans | PostgreSQL (`DATABASE_URL`) | Seeded operational sample data on first deploy |
| Users | PostgreSQL `User` table | Bootstrap admin `admin@flo.demo` (password from `FLO_BOOTSTRAP_PASSWORD`); additional users created by ADMIN at `/admin/users`. Hashed with scrypt + 16-byte salt (`src/lib/auth/password.ts`) |
| Session cookie | `flo_session` (`src/lib/auth/session-token.ts`) | HttpOnly, SameSite=Lax, 12 h; signed with HMAC-SHA256 using `FLO_SESSION_SECRET` (fallback dev secret if unset) |
| Locale preference | `flo_locale` cookie (`src/proxy.ts`) | SameSite=Lax; no tracking IDs |
| Chat history | Browser `localStorage` | Client-only; not uploaded |
| CV session summaries | Browser `localStorage` | Client-only |
| AI provider config | SQLite `AiProviderConfig` (singleton) | ADMIN-saved mode, base URL, model, and optional API key; never returned to the browser |

## Access (RBAC)

The app uses role-based access control on **pages, navigation, and API routes**.
Read and mutation APIs call `requireApiRole` server-side; there is no browser
credential or API-key path. The health endpoint is intentionally public for
deployment checks.

| Role | Typical user | Sees |
|------|---------|------|
| `ADMIN` | admin@flo.demo (bootstrap) plus any admin created at `/admin/users` | Everything (including `/admin/users`, `/admin/process-map`, `/admin/mockup-data`, and AI provider Save) |
| `OPS_MANAGER` | created by an admin | Fleet, routing, reports, Control Tower, intelligence, reconciliation, AI assistant |
| `DRIVER` | created by an admin | `/routing/plan` and `/routing/dashboard` only |
| `WAREHOUSE` | created by an admin | `/routing/orders` and `/computer-vision/*` |

`src/proxy.ts` redirects unauthenticated visitors to `/login?next=…` and sends
role-mismatched paths to each role's default home (`defaultHomeForRole` in
`src/lib/auth/roles.ts`). API handlers repeat the check because proxy routing is
not an authorization boundary. Admin-only configuration includes intelligence
provider priority, regions, thresholds, and connector settings; Ops/Warehouse
can inspect feeds, run reconciliation, and resolve operational issues.

We do **not** ship product analytics, ad pixels, or third-party telemetry SDKs.

## What the assistant does by default

The Company Assistant uses the in-process operations helper in
`src/lib/ai-chat.ts`. It answers from live PostgreSQL snapshots. **No prompts are
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
| Open-Meteo | (none for the public forecast endpoint) | Weather observations and forecast conditions |
| TomTom Orbis Traffic | `TOMTOM_API_KEY` | Traffic incidents and road closures |
| Pertamina fuel list | (none — public page fetch) | Regional fuel prices for cost estimates |
| Ollama (local) | AI Settings → Ollama, or installer | Local open-weight LLM |
| OpenAI-compatible LLM | AI Settings or `AI_ALLOW_EXTERNAL` + key + base URL | Optional richer NL answers |

Computer vision demos process webcam frames **on-device** in the browser. The
guided tour at `/computer-vision/tour` uses static sample frames so judges can
review the feature without camera permission.

Parcel verification follows the same posture: webcam and uploaded label images
are decoded in the browser, are not sent to a vision provider, and are not
stored. Only the scanned barcode value and the resulting OMS/WMS verification
decision can be sent to the authenticated FLO API; an operator may explicitly
create an audited Control Tower exception.

## Local install

Laptop operators can run `npm run install:flo` after cloning. The wizard writes
`.env.local`, runs migrations, and optionally checks Ollama. See
`scripts/install.mjs`.

## Reporting

For security issues in this competition prototype, contact the Quasarian /
FLO team maintainers via the repository owners.
