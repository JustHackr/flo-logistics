# FLO final product + Android APK

**Status:** approved 2026-09-22  
**Workspace:** `/Users/justradr/flo-logistics` on branch `final-mobile`  
**Out of scope:** iOS, Play Store listing, OAuth/SSO, React Native rewrite, fully offline APK

## Goal

Ship one production FLO: Matthew/`GoldenBough` features plus JustHackr `main` laptop-install docs, real admin-created accounts (one bootstrap master email), and a signed Android APK that wraps the live server.

## Product merge

- **Base:** `origin/GoldenBough` (`30a526b`) — Control Tower, predictive SLA, traffic/weather intelligence, OMS/WMS reconciliation, parcel QR, reverse logistics, chain of custody, judge scenario/impact. PostgreSQL required.
- **Bring from `main`:** `npm run install:flo` / `scripts/bootstrap.sh`, README jump links and laptop requirements, installer polish. Retarget installer from SQLite to PostgreSQL (`DATABASE_URL` required).
- **Identity:** keep package as FLO; public URL stays `https://radr.nxtdev.xyz/flo-logistics/demo`.

## Auth (no demo personas)

- Login is email + password only. Remove persona cards, `quickLoginAction`, and `DEMO_ACCOUNTS`.
- **Bootstrap master:** `admin@flo.demo`, role `ADMIN`, name `FLO Admin`. Password from `FLO_BOOTSTRAP_PASSWORD` (required to seed; never hardcode `demo1234` in production seed).
- Seed creates **only** this user. Do not seed ops/driver/warehouse accounts.
- **Admin-created users:** ADMIN at `/admin/users` can create users (email, name, role `ADMIN` | `OPS_MANAGER` | `DRIVER` | `WAREHOUSE`, password). No public signup.
- Cannot delete the last remaining `ADMIN`. Cannot delete the signed-in user.
- Existing `loginAction` (Prisma lookup + scrypt) stays the only sign-in path.

## Android APK

- Capacitor 7 WebView shell. The APK does **not** embed Next.js or Postgres.
- Production `server.url`: `https://radr.nxtdev.xyz/flo-logistics/demo`
- Android permissions: `INTERNET`, `CAMERA` (CV uses in-browser `getUserMedia`).
- Signed **release** APK (`assembleRelease`). Keystore is local/gitignored; passwords never committed.
- App is a client of the VPS. Offline-only FLO is out of scope.

## VPS

- Upgrade `flo-demo` systemd unit from SQLite `file:` URL to PostgreSQL `DATABASE_URL`.
- Set `FLO_BOOTSTRAP_PASSWORD` and a real `FLO_SESSION_SECRET` on the server only.
- Deploy with existing `lighthouse.pem` → `ubuntu@43.134.182.44`.
- Team site (`:3010`) unchanged except copy that still advertises demo personas.

## Architecture

```
APK (Capacitor WebView)
  → https://radr.nxtdev.xyz/flo-logistics/demo
  → nginx → Next.js :3011
  → PostgreSQL
Admin (admin@flo.demo) creates operator users in /admin/users
```

## Success

1. Merged tree builds and unit tests pass against Postgres.
2. `/login` has no persona cards; `admin@flo.demo` can sign in and create users.
3. Release APK installs, loads the live demo, camera permission is requested on CV screens.
4. VPS demo no longer documents `demo1234` / one-click personas.
