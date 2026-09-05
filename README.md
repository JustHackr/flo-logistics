# FLO (Fab Logistics Operations)

Next.js logistics webapp with traffic-aware route optimization for Jakarta last-mile delivery.

Live demo: [https://flo-logistics.vercel.app](https://flo-logistics.vercel.app)

## Quick start (no API keys required)

Routing works out of the box using free OSRM road distances and a local Jakarta traffic model. No `.env.local` file is needed for local development.

```bash
npm install
npm run dev
```

Open [http://localhost:3000/routing/orders](http://localhost:3000/routing/orders) to view seeded demo orders, select several, and generate an optimized route plan.

The `build` script runs `prisma migrate deploy` and `db:seed` automatically, so production builds also include demo warehouse, drivers, and orders.

### How routing estimates work

| Priority | Source | Cost |
|----------|--------|------|
| 1 (default) | OSRM public API + Jakarta traffic model | Free |
| 2 (fallback) | Local Jakarta Haversine model | Free, offline |
| 3 (optional) | Google Maps live traffic | Paid — requires billing |

Set a departure time on the plan page to apply Jakarta rush-hour multipliers (e.g. weekday 08:00 vs 14:00).

### Optional: Google Maps upgrade

To enable live Google traffic, copy `.env.example` to `.env.local` and add a `GOOGLE_MAPS_API_KEY`. See `.env.example` for setup steps. This is **not required** for the demo.

To **visualize routes on Google Maps** (Plan Route and Logistics Dashboard), also set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and enable the **Maps JavaScript API** and **Directions API** in Google Cloud Console. Route maps use server polylines when available, otherwise the browser Directions API draws road-following paths.

Demo warehouse: **Blok M Square**. Order coordinates are validated against Greater Jakarta (Jabodetabek) bounds. Generate sample CSVs at `/admin/mockup-data`.

### Database

SQLite is used by default (`DATABASE_URL` defaults to `file:./dev.db`). Reset and re-seed with:

```bash
npm run db:reset
```

### Production note

The public OSRM demo server (`router.project-osrm.org`) has no SLA. For production at scale, consider self-hosting [OSRM](https://project-osrm.org/) (free, open source).

## Development

```bash
npm run dev      # Start dev server
npm run lint     # ESLint
npm run test     # Unit tests (no network)
npm run db:seed  # Seed demo data
```

## Learn more

- [Next.js Documentation](https://nextjs.org/docs)
