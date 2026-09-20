# Android companion — development backlog

Grilled decisions for a **Kotlin + Jetpack Compose** Android front-end that talks to the FLO Next.js demo. This file is the backlog only — there is **no** `android/` scaffold yet.

## Goal

Ship a judge-friendly mobile companion where:

- Every web RBAC role can **log in** and land on a role home.
- **Driver** is the only deep role in milestone 1 (today’s assignment, map, stop status).
- Demo logins map to real `Driver` + `RoutePlan` data so two drivers see **different** routes.
- Online-first: last successful assignment is cached for offline **view**; no offline write queue in m1.

## Non-goals (m1)

- Navigation SDK / in-app turn-by-turn
- Offline write sync / outbox queue
- Full Ops / Admin / Warehouse dashboards (stubs only)
- Play Store release signing
- Replacing the web app or changing server SQLite as source of truth

## Locked decisions

| Decision | Choice |
|----------|--------|
| Personas | Full RBAC shells day one; **Driver** deepest in m1 |
| Offline | **Online-first** + last-snapshot cache; **no** write queue |
| Maps | **Maps SDK** (live location + polyline + waypoints); navigate via **external Google Maps Intent** |
| Dummy drivers | **Several** demo DRIVER logins, each linked to a real `Driver` + `RoutePlan` |
| Non-driver depth | Login + role **home stubs** only |
| Stack | Kotlin + Jetpack Compose |
| Login UX | **Persona picker** (tap a demo user); password pre-filled, shown as asterisks |
| Visual design | Same palette as the web app ([`src/app/globals.css`](../src/app/globals.css)); Compose theme mapped 1:1 |

## Context (current FLO)

- Roles: `ADMIN` \| `OPS_MANAGER` \| `DRIVER` \| `WAREHOUSE` — [`src/lib/auth/roles.ts`](../src/lib/auth/roles.ts)
- `User` is **not** FK’d to `Driver` today — [`prisma/schema.prisma`](../prisma/schema.prisma)
- Best read model: `GET /api/routing/logistics/overview`
- Status write: `POST /api/routing/orders/[id]/status`
- Web session: `flo_session` cookie; **no** Bearer/mobile auth yet; APIs mostly open — [`SECURITY.md`](../SECURITY.md)
- Seeded web personas (password `demo1234`): `admin@flo.demo`, `ops@flo.demo`, `driver@flo.demo`, `warehouse@flo.demo`

## Architecture (m1)

```text
Android (Compose)
  ├─ FloTheme (Material3 ← web CSS tokens)
  ├─ Persona login → Bearer token (EncryptedSharedPreferences)
  ├─ Role router → stub homes | Driver flow
  ├─ Room / DataStore ← last assignment snapshot
  └─ Maps SDK + geo Intent
         │
         ▼
Next.js mobile APIs (this monorepo)
  ├─ POST /api/auth/mobile/login
  ├─ GET  /api/mobile/me
  ├─ GET  /api/mobile/driver/assignment
  └─ POST /api/routing/orders/[id]/status (auth + scoped)
         │
         ▼
Prisma / SQLite (source of truth)
```

## Design system — web parity

Source of truth: light theme in [`src/app/globals.css`](../src/app/globals.css) (“Soft app white + Blibli azure”). Convert oklch once into Compose `Color` / ARGB. **Do not** ship Material default purple.

| Token | Web | Android hex (approx.) |
|-------|-----|------------------------|
| background | `#f7f9fc` | `#F7F9FC` |
| foreground | `oklch(0.28 0.04 255)` | `#1B2A3C` |
| card | `#ffffff` | `#FFFFFF` |
| primary | `oklch(0.54 0.17 252)` | `#006FCD` |
| primary-foreground | `#ffffff` | `#FFFFFF` |
| secondary | `oklch(0.95 0.02 245)` | `#E4F0FB` |
| secondary-foreground | `oklch(0.36 0.08 252)` | `#1A3F66` |
| muted | `oklch(0.96 0.015 245)` | `#EAF3FB` |
| muted-foreground | `oklch(0.5 0.03 250)` | `#576574` |
| accent | `oklch(0.94 0.035 248)` | `#DAEEFF` |
| accent-foreground | `oklch(0.36 0.09 252)` | `#123E6A` |
| destructive | `oklch(0.577 0.245 27.325)` | `#E7000B` |
| border / input | `oklch(0.9 0.02 245)` | `#D4E0EB` |
| ring | `oklch(0.62 0.14 252)` | `#3E89D7` |
| chart-1…5 | blues | `#3B82F6`, `#60A5FA`, `#2563EB`, `#93C5FD`, `#1D4ED8` |
| radius | `0.75rem` | ~12dp |

Default ship **light** to match the demo site. Map system dark only if using web `.dark` tokens.

Use `FloTheme` on login, stubs, driver screens, buttons, banners, and map polyline/chrome accents.

---

## Checklist

### Backend (this monorepo) — prerequisite

- [ ] Link `User` ↔ `Driver` (nullable `driverId` on `User`, or join table)
- [ ] Seed **3+ DRIVER** demo users (e.g. `driver@flo.demo`, `driver2@flo.demo`, `driver3@flo.demo`), each with a distinct `IN_PROGRESS` / `PLANNED` route (different stops/schedules)
- [ ] Keep Admin / Ops / Warehouse seed users; shared demo password remains `demo1234`
- [ ] `POST /api/auth/mobile/login` → opaque Bearer token or JWT; logout / refresh as needed
- [ ] `GET /api/mobile/me` — role + linked driver profile (if any)
- [ ] `GET /api/mobile/driver/assignment` — **scoped** today’s route for the authenticated driver (waypoints, ETAs, encoded polyline, stop statuses)
- [ ] Harden order status: require auth; driver may only update stops on **their** plan
- [ ] Document Android Maps API key vs existing server `GOOGLE_MAPS_*` in `.env.example` / SECURITY note

### Android app (future `android/`) — milestone 1

- [ ] Compose project scaffold; product flavors for local + VPS base URL (`/flo-logistics/demo`)
- [ ] **Design system / theme parity** — Material3 `FloTheme` from the table above; no stock Material purple
- [ ] Login — **judge-fast persona list** (primary path; not blank email/password):
  - List all demo personas (Admin, Ops, Warehouse, **and each linked Driver**) with name + role + email
  - Selecting a row/card **pre-fills** email and password; password field shows **asterisks / dots** (`••••••••`) so judges never type `demo1234`
  - One-tap **Sign in** (or tap-card-to-login); optional manual fields collapsed for edge cases
  - Persist token in EncryptedSharedPreferences
  - Ship a static demo-account catalog matching seed emails/password (optional later: `GET /api/mobile/demo-accounts`)
- [ ] Role router: Admin / Ops / Warehouse **stub homes**; Driver → assignment flow
- [ ] Driver: assignment list + stop detail; mark delivered / failed via status API
- [ ] Location permission flow (fine + rationale; deny → map without blue dot)
- [ ] Maps SDK: device location, encoded polyline, waypoint markers; **Navigate** → Google Maps geo Intent (polyline accent = primary azure)
- [ ] Room / DataStore: persist last assignment snapshot; show “cached / offline” banner when fetch fails
- [ ] Pull-to-refresh / retry; basic error and empty states

### Backlog (after m1)

- [ ] Offline write queue / outbox
- [ ] Navigation SDK
- [ ] Real Ops / Admin / Warehouse dashboards
- [ ] Push notifications
- [ ] Play Store signing / release track

---

## Acceptance criteria (driver demo)

1. UI clearly matches web FLO blues / `#F7F9FC` background (not Material purple).
2. Persona list shows every demo user; judges log in **without typing** credentials (password pre-filled, masked).
3. Two different **Driver** personas show **different** routes.
4. Map shows waypoints + live location when permission granted.
5. Stop status update appears on the web logistics overview after refresh.

## Suggested order of work

1. Backend: User↔Driver link + multi-driver seed  
2. Backend: mobile login + `me` + `assignment` + scoped status  
3. Android: scaffold + FloTheme + persona login  
4. Android: role stubs + Driver assignment UI  
5. Android: Maps + location + Navigate Intent  
6. Android: Room snapshot + offline banner  

## References

- Web RBAC / demo personas: [`src/lib/auth/roles.ts`](../src/lib/auth/roles.ts)
- Theme: [`src/app/globals.css`](../src/app/globals.css)
- Security posture: [`SECURITY.md`](../SECURITY.md)
- Logistics overview API: `GET /api/routing/logistics/overview`
