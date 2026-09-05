# FLO — Fab Logistics Operations

Next.js logistics webapp with traffic-aware route optimization for Jakarta last-mile delivery.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000/routing/orders](http://localhost:3000/routing/orders) to view seeded demo orders, select several, and generate an optimized route plan.

The `build` script runs `prisma migrate deploy` and `db:seed` automatically, so production builds also include demo warehouse, drivers, and orders.

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

### AI assistant (optional)

Set `AI_API_KEY` (and optionally `AI_BASE_URL` / `AI_MODEL`) on the server.
Chat uses the shared deployment credentials or falls back to the built-in local
operations helper.

Demo warehouse: **Blok M Square**. Order coordinates are validated against Greater Jakarta (Jabodetabek) bounds. Generate sample CSVs at `/admin/mockup-data`.

### Database

SQLite is used by default (`DATABASE_URL` defaults to `file:./dev.db`). Reset and re-seed with:

```bash
npm run db:reset
```

### Production note

The public OSRM demo server (`router.project-osrm.org`) has no SLA. For production at scale, consider self-hosting [OSRM](https://project-osrm.org/).

## Development

```bash
npm run dev      # Start dev server
npm run lint     # ESLint
npm run test     # Unit tests (no network)
npm run db:seed  # Seed demo data
```

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
