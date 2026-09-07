# FLO — Fab Logistics Operations

Next.js logistics webapp with traffic-aware route optimization for Jakarta last-mile delivery.

## Sovereign AI (default)

FLO answers operational questions with an **on-deployment assistant** that reads live SQLite data. Prompts do not leave the server unless an operator opts into an external OpenAI-compatible LLM.

| Mode | When | Behavior |
|------|------|----------|
| Sovereign (default) | No `AI_ALLOW_EXTERNAL` | In-process helper (`src/lib/ai-chat.ts`) |
| External (opt-in) | `AI_ALLOW_EXTERNAL=true` + `AI_API_KEY` + `AI_BASE_URL` | OpenAI-compatible chat completions |

See [SECURITY.md](./SECURITY.md) and the in-app **Sovereign AI** page (`/sovereign-ai`) for the full privacy posture. Maps, live traffic, and Pertamina fuel prices remain optional external services because they cannot run fully offline.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/login](http://localhost:3000/login) and pick a demo
persona (all accounts share the password `demo1234`):

| Persona | Email | Role |
|---------|-------|------|
| Demo Admin | admin@flo.demo | ADMIN |
| Ops Manager | ops@flo.demo | OPS_MANAGER |
| Bima Nugraha (driver) | driver@flo.demo | DRIVER |
| Warehouse Lead | warehouse@flo.demo | WAREHOUSE |

After signing in, the demo lands on the role's default workspace
(`/routing/plan` for drivers, `/computer-vision/load-detection` for warehouse,
`/routing/dashboard` for ops).

The `build` script runs `prisma migrate deploy` and `db:seed` automatically, so production builds also include demo warehouse, drivers, and orders. Seed skips if a route plan was updated in the last hour (set `FORCE_SEED=true` to override, or `SKIP_SEED=true` to never reseed).

### How routing estimates work

| Priority | Source |
|----------|--------|
| 1 (default) | OSRM + Jakarta traffic model |
| 2 (fallback) | Local Jakarta Haversine model |
| 3 (optional) | Google Maps live traffic |

Set a departure time on the plan page to apply Jakarta rush-hour multipliers (e.g. weekday 08:00 vs 14:00).

### Google Maps (optional)

To enable live Google traffic and interactive maps on a deployment, set
**server-side** environment variables (Vercel → Environment Variables, or
`.env.local` locally). Do **not** use `NEXT_PUBLIC_` for secret values.

| Variable | Purpose |
|----------|---------|
| `GOOGLE_MAPS_API_KEY` | Routes API (traffic + polylines) |
| `GOOGLE_DISTANCE_MATRIX_API_KEY` | Optional Distance Matrix fallback |
| `GOOGLE_MAPS_JS_API_KEY` | Optional referrer-restricted Maps JS key (falls back to `GOOGLE_MAPS_API_KEY`) |

The browser loads the Maps JS key only from `/api/routing/maps/js-config` after
mount. Route geometry is computed server-side via `/api/routing/routes/polyline`.

### AI assistant

**Default:** sovereign local assistant (no API key required).

**Optional external LLM** (leave sovereign mode):

| Variable | Purpose |
|----------|---------|
| `AI_ALLOW_EXTERNAL` | Must be `true` to enable outbound LLM calls |
| `AI_API_KEY` | Bearer token for the provider |
| `AI_BASE_URL` | OpenAI-compatible base URL (required when external is enabled) |
| `AI_MODEL` | Model id (optional) |

Demo warehouse: **Blok M Square**. Order coordinates are validated against Greater Jakarta (Jabodetabek) bounds. Generate sample CSVs at `/admin/mockup-data`. Guided computer-vision walkthrough (no webcam): `/computer-vision/tour`. Admin-only business-process visualisation (n8n-style node map): `/admin/process-map`.

### Database

SQLite is used by default (`DATABASE_URL` defaults to `file:./dev.db`). Reset and re-seed with:

```bash
npm run db:reset
```

### Production note

The public OSRM demo server (`router.project-osrm.org`) has no SLA. For production at scale, consider self-hosting [OSRM](https://project-osrm.org/).

Health probe: `GET /api/health` → `{ ok, db, provider }`.

## Development

```bash
npm run dev      # Start dev server
npm run lint     # ESLint
npm run test     # Unit tests (no network)
npm run db:seed  # Seed demo data
```

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
- Live demo: https://radr.nxtdev.xyz/flo-logistics/demo
