# FLO Final Product + Android APK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge GoldenBough + main into one PostgreSQL FLO, replace demo personas with a single `admin@flo.demo` bootstrap plus admin-created users, and ship a signed Capacitor release APK that loads the VPS demo.

**Architecture:** Branch `final-mobile` from `origin/GoldenBough`, merge `main` docs/installer, then strip demo auth, add `/admin/users`, wrap the live HTTPS origin in Capacitor Android, and point `flo-demo` systemd at Postgres.

**Tech Stack:** Next.js 16, Prisma 7 + PostgreSQL (`pg` / `@prisma/adapter-pg`), existing scrypt session cookies, Capacitor 7 Android WebView, Gradle `assembleRelease`.

## Global Constraints

- Workspace: `/Users/justradr/flo-logistics` on branch `final-mobile`.
- GitHub remote owner stays `JustHackr`.
- Do not commit unless the user explicitly asks.
- Never commit `.pem`, keystores, `FLO_BOOTSTRAP_PASSWORD`, or `FLO_SESSION_SECRET`.
- Bootstrap email is exactly `admin@flo.demo`. Do not seed `ops@flo.demo`, `driver@flo.demo`, or `warehouse@flo.demo`.
- Do not hardcode password `demo1234` in seed or UI.
- Production APK `server.url` is `https://radr.nxtdev.xyz/flo-logistics/demo`.
- PostgreSQL is required; SQLite `better-sqlite3` is not used on this branch.
- Node.js >= 20.
- Camera CV stays in-browser `getUserMedia`; do not rewrite detectors as native plugins.
- Keep existing RBAC path map from GoldenBough (`OPS_MANAGER` home `/control-tower`).

## File map

- Merge: whole tree; expected conflicts in `README.md`, `SECURITY.md`, `package.json`, `.env.example`, `scripts/install.mjs`.
- Auth: `src/lib/auth/roles.ts`, `src/lib/auth/users.ts` (new), `src/app/actions/auth.ts`, `src/app/actions/users.ts` (new), `src/app/login/login-experience.tsx`, `prisma/seed.ts`.
- Admin UI: `src/app/admin/users/page.tsx`, `src/components/admin/users-client.tsx`, `src/components/app-shell.tsx`, `src/messages/en.json`, `src/messages/id.json`.
- Tests: `src/lib/auth/users.test.ts`, `src/lib/auth/roles.test.ts`, `src/app/actions/auth.ts` (delete `quickLoginAction`).
- Mobile: `capacitor.config.ts`, `android/` (Capacitor-generated), `android/app/src/main/AndroidManifest.xml`.
- Deploy: `deploy/systemd/flo-demo.service`, `deploy/deploy-vps.sh`, `deploy/README.md`, `.env.example`.

---

### Task 1: Branch from GoldenBough and merge main

**Files:**
- Modify: whole tree via git merge
- Keep GoldenBough: `package.json`, `prisma/`, `src/`, `scripts/intelligence-worker.ts`, `scripts/returns-worker.ts`
- Keep/merge from main: `scripts/install.mjs`, `scripts/bootstrap.sh`, README install sections

**Interfaces:**
- Consumes: `origin/GoldenBough` at `30a526b`, `main` at `7b37458`
- Produces: branch `final-mobile` with Postgres schema + installer scripts present

- [ ] **Step 1: Create branch from GoldenBough**

```bash
cd /Users/justradr/flo-logistics
git checkout -b final-mobile origin/GoldenBough
```

Expected: `Switched to a new branch 'final-mobile'` tracking the Postgres/feature tree.

- [ ] **Step 2: Merge main**

```bash
git merge main --no-edit
```

Expected: conflicts in docs/installer (`README.md`, `SECURITY.md`, `package.json`, `.env.example`).

- [ ] **Step 3: Resolve conflicts**

Resolution rules:

- `package.json`: **GoldenBough** scripts and deps (`pg`, `@prisma/adapter-pg`, `intelligence:worker`). Add main's `"install:flo": "node scripts/install.mjs"` script. Do **not** restore `better-sqlite3`.
- `prisma/` and `src/`: **GoldenBough**.
- `scripts/install.mjs` and `scripts/bootstrap.sh`: keep from main (Task 6 will retarget them to Postgres).
- `README.md` / `SECURITY.md` / `.env.example`: keep GoldenBough feature text; keep main's install command block; Task 6 rewrites copy after auth changes.
- If `package-lock.json` conflicts, take GoldenBough then run `npm install` to regenerate.

- [ ] **Step 4: Install and generate Prisma client**

```bash
npm ci
npx prisma generate
```

Expected: lockfile consistent; `src/generated/prisma` created (gitignored).

- [ ] **Step 5: Run unit tests that do not need Postgres**

```bash
npm test
```

Expected: existing Vitest suite passes (GoldenBough tests are in-memory). If failures are merge artifacts, fix before Task 2.

---

### Task 2: Bootstrap admin constant and seed

**Files:**
- Modify: `src/lib/auth/roles.ts`
- Modify: `prisma/seed.ts`
- Create: `src/lib/auth/bootstrap.ts`
- Test: `src/lib/auth/bootstrap.test.ts`

**Interfaces:**
- Consumes: `hashPassword` from `src/lib/auth/password.ts`; Prisma `User` model
- Produces:

```ts
export const BOOTSTRAP_ADMIN_EMAIL = "admin@flo.demo";
export const BOOTSTRAP_ADMIN_NAME = "FLO Admin";
export function requireBootstrapPassword(): string;
```

- [ ] **Step 1: Write failing tests**

Create `src/lib/auth/bootstrap.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { BOOTSTRAP_ADMIN_EMAIL, requireBootstrapPassword } from "./bootstrap";

describe("bootstrap admin", () => {
  it("uses the approved master email", () => {
    expect(BOOTSTRAP_ADMIN_EMAIL).toBe("admin@flo.demo");
  });

  it("requires FLO_BOOTSTRAP_PASSWORD", () => {
    const prev = process.env.FLO_BOOTSTRAP_PASSWORD;
    delete process.env.FLO_BOOTSTRAP_PASSWORD;
    expect(() => requireBootstrapPassword()).toThrow(/FLO_BOOTSTRAP_PASSWORD/);
    process.env.FLO_BOOTSTRAP_PASSWORD = prev;
  });

  it("rejects the old demo password", () => {
    process.env.FLO_BOOTSTRAP_PASSWORD = "demo1234";
    expect(() => requireBootstrapPassword()).toThrow(/demo1234/);
  });

  it("rejects short passwords", () => {
    process.env.FLO_BOOTSTRAP_PASSWORD = "short";
    expect(() => requireBootstrapPassword()).toThrow(/at least 10/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/auth/bootstrap.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement bootstrap helper**

Create `src/lib/auth/bootstrap.ts`:

```ts
export const BOOTSTRAP_ADMIN_EMAIL = "admin@flo.demo";
export const BOOTSTRAP_ADMIN_NAME = "FLO Admin";

const FORBIDDEN = new Set(["demo1234", "password", "admin", "flo"]);

export function requireBootstrapPassword(): string {
  const password = process.env.FLO_BOOTSTRAP_PASSWORD ?? "";
  if (!password) {
    throw new Error("FLO_BOOTSTRAP_PASSWORD is required to seed the bootstrap admin.");
  }
  if (password.length < 10) {
    throw new Error("FLO_BOOTSTRAP_PASSWORD must be at least 10 characters.");
  }
  if (FORBIDDEN.has(password.toLowerCase())) {
    throw new Error("FLO_BOOTSTRAP_PASSWORD must not be demo1234 or another trivial password.");
  }
  return password;
}
```

- [ ] **Step 4: Remove `DEMO_ACCOUNTS` from `src/lib/auth/roles.ts`**

Delete the `DEMO_ACCOUNTS` export (lines 86–110 on GoldenBough). Keep `ROLES`, `ROLE_PATHS`, `canAccessPath`, `defaultHomeForRole`. Ops home stays `/control-tower`.

Add `/admin` remains ADMIN-only via `"*"`.

- [ ] **Step 5: Seed only the bootstrap admin**

In `prisma/seed.ts`, replace the `DEMO_ACCOUNTS` import and the `for (const account of DEMO_ACCOUNTS)` loop with:

```ts
import { hashPassword } from "../src/lib/auth/password";
import {
  BOOTSTRAP_ADMIN_EMAIL,
  BOOTSTRAP_ADMIN_NAME,
  requireBootstrapPassword,
} from "../src/lib/auth/bootstrap";

// inside main(), after deleteMany users:
const bootstrapPassword = requireBootstrapPassword();
await prisma.user.create({
  data: {
    email: BOOTSTRAP_ADMIN_EMAIL,
    name: BOOTSTRAP_ADMIN_NAME,
    role: "ADMIN",
    passwordHash: hashPassword(bootstrapPassword),
  },
});
```

Keep vehicle/order/driver fixture data (operational sample data is not a login persona).

- [ ] **Step 6: Run tests**

```bash
npx vitest run src/lib/auth/bootstrap.test.ts src/lib/auth/roles.test.ts
```

Expected: PASS. `roles.test.ts` must still expect `defaultHomeForRole("OPS_MANAGER") === "/control-tower"`.

---

### Task 3: Production login UI (no personas)

**Files:**
- Modify: `src/app/actions/auth.ts`
- Modify: `src/app/login/login-experience.tsx`
- Modify: `src/messages/en.json`, `src/messages/id.json`

**Interfaces:**
- Consumes: `loginAction`, `logoutAction`
- Produces: login page with email/password only; `quickLoginAction` removed

- [ ] **Step 1: Delete `quickLoginAction` from `src/app/actions/auth.ts`**

Remove the function entirely. Keep `loginAction` and `logoutAction`.

- [ ] **Step 2: Strip persona UI from `src/app/login/login-experience.tsx`**

- Remove imports of `quickLoginAction` and `DEMO_ACCOUNTS`.
- Remove the persona grid (`DEMO_ACCOUNTS.map`) and `handleQuickLogin`.
- Keep email + password form bound to `loginAction`.
- Placeholder email: `admin@flo.demo`. Do not show a password placeholder of `demo1234`.
- Signed-in state: continue + sign out only (no “switch persona”).

- [ ] **Step 3: Update i18n copy**

In `src/messages/en.json` `auth` block (mirror in `id.json`):

- `demoBadge` → `"Operations access"`
- `subtitle` → `"Sign in with your FLO account."`
- `quickTitle` / `quickHint` / `loginAs` / `orCredentials` / `passwordNote`: unused — change `credentialsHint` to `"Use the email and password issued by your administrator."`
- `stats.live` → `"Live from operations DB"` (stop saying “demo DB” on the login pane)

- [ ] **Step 4: Grep for leftover personas**

```bash
rg -n "quickLoginAction|DEMO_ACCOUNTS|demo1234|Pick a demo persona" src prisma
```

Expected: no matches except possibly comments in SECURITY/README to be fixed in Task 6.

---

### Task 4: Admin user management

**Files:**
- Create: `src/lib/auth/users.ts`
- Create: `src/lib/auth/users.test.ts`
- Create: `src/app/actions/users.ts`
- Create: `src/app/admin/users/page.tsx`
- Create: `src/components/admin/users-client.tsx`
- Modify: `src/components/app-shell.tsx`
- Modify: `src/messages/en.json`, `src/messages/id.json`

**Interfaces:**
- Consumes: `prisma.user`, `hashPassword`, `ROLES`, `getSession`
- Produces:

```ts
export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
};

export function parseCreateUserInput(raw: CreateUserInput): CreateUserInput;
export async function createUser(input: CreateUserInput): Promise<{ id: string }>;
export async function listUsers(): Promise<Array<{ id: string; email: string; name: string; role: Role; createdAt: Date }>>;
export async function deleteUser(id: string, actorId: string): Promise<void>;
```

- [ ] **Step 1: Write failing validation tests**

`src/lib/auth/users.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseCreateUserInput } from "./users";

describe("parseCreateUserInput", () => {
  const base = {
    email: "ops@flo.internal",
    name: "Ops Lead",
    password: "correct-horse",
    role: "OPS_MANAGER" as const,
  };

  it("lowercases email", () => {
    expect(parseCreateUserInput({ ...base, email: "Ops@FLO.Internal" }).email).toBe(
      "ops@flo.internal",
    );
  });

  it("rejects invalid email", () => {
    expect(() => parseCreateUserInput({ ...base, email: "not-an-email" })).toThrow(/email/);
  });

  it("rejects short password", () => {
    expect(() => parseCreateUserInput({ ...base, password: "short" })).toThrow(/10/);
  });

  it("rejects demo1234", () => {
    expect(() => parseCreateUserInput({ ...base, password: "demo1234" })).toThrow(/password/);
  });

  it("rejects empty name", () => {
    expect(() => parseCreateUserInput({ ...base, name: "  " })).toThrow(/name/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/lib/auth/users.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/auth/users.ts`**

```ts
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { isRole, type Role } from "@/lib/auth/roles";
import { BOOTSTRAP_ADMIN_EMAIL } from "@/lib/auth/bootstrap";

export type CreateUserInput = {
  email: string;
  name: string;
  password: string;
  role: Role;
};

export function parseCreateUserInput(raw: {
  email: string;
  name: string;
  password: string;
  role: string;
}): CreateUserInput {
  const email = raw.email.trim().toLowerCase();
  const name = raw.name.trim();
  const password = raw.password;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid email is required.");
  }
  if (name.length < 1 || name.length > 80) {
    throw new Error("Name is required (max 80 characters).");
  }
  if (password.length < 10) {
    throw new Error("Password must be at least 10 characters.");
  }
  if (password.toLowerCase() === "demo1234") {
    throw new Error("Choose a stronger password.");
  }
  if (!isRole(raw.role)) {
    throw new Error("Invalid role.");
  }
  return { email, name, password, role: raw.role };
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
}

export async function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: hashPassword(input.password),
    },
    select: { id: true },
  });
}

export async function deleteUser(id: string, actorId: string) {
  if (id === actorId) {
    throw new Error("You cannot delete your own account.");
  }
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new Error("User not found.");
  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Cannot delete the last administrator.");
    }
  }
  if (target.email === BOOTSTRAP_ADMIN_EMAIL) {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      throw new Error("Cannot delete the bootstrap administrator.");
    }
  }
  await prisma.user.delete({ where: { id } });
}
```

- [ ] **Step 4: Server actions `src/app/actions/users.ts`**

Mirror `src/app/actions/designer.ts` admin gate:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth/session";
import {
  createUser,
  deleteUser,
  parseCreateUserInput,
} from "@/lib/auth/users";

export type UserActionResult = { ok: true } | { ok: false; message: string };

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function createUserAction(formData: FormData): Promise<UserActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "Admin role required." };
  try {
    const parsed = parseCreateUserInput({
      email: String(formData.get("email") ?? ""),
      name: String(formData.get("name") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? ""),
    });
    await createUser(parsed);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not create user." };
  }
}

export async function deleteUserAction(userId: string): Promise<UserActionResult> {
  const session = await requireAdmin();
  if (!session) return { ok: false, message: "Admin role required." };
  try {
    await deleteUser(userId, session.id);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Could not delete user." };
  }
}
```

- [ ] **Step 5: Page + client**

`src/app/admin/users/page.tsx` — same ADMIN redirect as designer:

```ts
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { defaultHomeForRole } from "@/lib/auth/roles";
import { listUsers } from "@/lib/auth/users";
import { UsersClient } from "@/components/admin/users-client";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    redirect(defaultHomeForRole(session?.role ?? "ADMIN"));
  }
  const users = await listUsers();
  return <UsersClient users={users} currentUserId={session.id} />;
}
```

`UsersClient`: form (name, email, password, role select) posting `createUserAction`; table of users with delete button calling `deleteUserAction`. Disable delete for `currentUserId`.

- [ ] **Step 6: Nav + i18n**

In GoldenBough `src/components/app-shell.tsx` system group, add:

```ts
{
  href: "/admin/users",
  labelKey: "nav.items.users",
  icon: Users,
  badgeKey: "nav.badges.admin",
},
```

Add `nav.items.users` = `"Users"` / `"Pengguna"` in `en.json` / `id.json`. Add a `users` message block for form labels.

- [ ] **Step 7: Run tests**

```bash
npx vitest run src/lib/auth/users.test.ts src/lib/auth/bootstrap.test.ts src/lib/i18n/dictionary-parity.test.ts
```

Expected: PASS (dictionary parity requires both locales).

---

### Task 5: Installer, env, docs

**Files:**
- Modify: `.env.example`
- Modify: `scripts/install.mjs`
- Modify: `README.md`
- Modify: `SECURITY.md`
- Modify: `package.json` `build` script (stop force-seeding demo accounts on every production build)

**Interfaces:**
- Consumes: `FLO_BOOTSTRAP_PASSWORD`, `DATABASE_URL`
- Produces: installer that writes Postgres URL + bootstrap password into `.env.local`

- [ ] **Step 1: `.env.example`**

Replace SQLite commentary. Required:

```
DATABASE_URL=postgresql://flo:flo@127.0.0.1:5432/flo
FLO_BOOTSTRAP_PASSWORD=
FLO_SESSION_SECRET=
```

Keep optional Maps/AI/TomTom keys from GoldenBough.

- [ ] **Step 2: `package.json` build**

GoldenBough currently:

`prisma generate && prisma db push --accept-data-loss && npm run db:seed:demo && next build`

Change to:

`prisma generate && prisma migrate deploy && node node_modules/next/dist/bin/next build`

Seed is explicit (`npm run db:seed`) so production deploys do not wipe users.

Keep `db:seed:demo` as `tsx prisma/seed.ts --force` for local resets only.

- [ ] **Step 3: Retarget `scripts/install.mjs`**

- Require `DATABASE_URL` starting with `postgres`.
- Prompt for `FLO_BOOTSTRAP_PASSWORD` (min 10, reject `demo1234`).
- Write `.env.local`.
- Run `npx prisma migrate deploy` then `npm run db:seed` (not sqlite reset).
- Help text: PostgreSQL 15+, not “SQLite”.

- [ ] **Step 4: README login table**

Replace four-persona table with:

| Account | Email | Password |
|---------|-------|----------|
| Bootstrap admin | `admin@flo.demo` | value of `FLO_BOOTSTRAP_PASSWORD` |

Document `/admin/users` for creating operators. Remove `demo1234`.

- [ ] **Step 5: `rg` docs**

```bash
rg -n "demo1234|better-sqlite3|file:./dev.db|Pick a demo persona" README.md SECURITY.md .env.example scripts
```

Expected: no `demo1234`; no sqlite as the production store.

---

### Task 6: Capacitor Android shell

**Files:**
- Create: `capacitor.config.ts`
- Create: `android/` via Capacitor CLI
- Modify: `package.json` scripts
- Modify: `.gitignore` (`android/keystores/`, `*.jks`, `keystore.properties`)

**Interfaces:**
- Consumes: live HTTPS origin
- Produces: Android project whose WebView loads FLO

- [ ] **Step 1: Add Capacitor deps**

```bash
npm install @capacitor/core @capacitor/app @capacitor/android
npm install -D @capacitor/cli
```

- [ ] **Step 2: `capacitor.config.ts`**

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "xyz.nxtdev.flo",
  appName: "FLO",
  webDir: "public",
  server: {
    url: "https://radr.nxtdev.xyz/flo-logistics/demo",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
```

`webDir` is unused when `server.url` is set; `public` is a valid existing folder so `npx cap sync` does not fail.

- [ ] **Step 3: Add Android platform**

```bash
npx cap add android
npx cap sync android
```

- [ ] **Step 4: Camera + internet permissions**

In `android/app/src/main/AndroidManifest.xml` inside `<manifest>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

Capacitor’s WebView must forward `onPermissionRequest` (default Capacitor 7 Android template does). Do not add a native Camera plugin unless `getUserMedia` is blocked after a device test.

- [ ] **Step 5: Scripts**

```json
"cap:sync": "npx cap sync android",
"apk:release": "cd android && ./gradlew assembleRelease"
```

---

### Task 7: Signed release APK

**Files:**
- Create: `android/keystore.properties.example`
- Create (local only): `android/keystores/flo-release.jks`
- Modify: `android/app/build.gradle` signingConfigs
- Modify: `.gitignore`

**Interfaces:**
- Produces: `android/app/build/outputs/apk/release/app-release.apk`

- [ ] **Step 1: Gitignore secrets**

```
android/keystores/
android/keystore.properties
*.jks
```

- [ ] **Step 2: Generate keystore locally** (do not print the password in chat after generation; store only in `keystore.properties`)

```bash
mkdir -p android/keystores
keytool -genkeypair -v -keystore android/keystores/flo-release.jks \
  -alias flo -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass "$FLO_ANDROID_STOREPASS" -keypass "$FLO_ANDROID_KEYPASS" \
  -dname "CN=FLO, OU=Quasarian, O=JustHackr, L=Jakarta, ST=Jakarta, C=ID"
```

If env passwords are unset, generate a random storepass into `android/keystore.properties` (gitignored) rather than using `android`.

- [ ] **Step 3: Wire signing in `android/app/build.gradle`**

Read `keystore.properties` from `rootProject.file("keystore.properties")` and set `signingConfigs.release`. `buildTypes.release.signingConfig signingConfigs.release`. `minifyEnabled false` unless ProGuard is already configured.

- [ ] **Step 4: Build**

```bash
cd android && ./gradlew assembleRelease
```

Expected: `BUILD SUCCESSFUL` and `app-release.apk`. If JDK/Android SDK missing, install Temurin 17 + Android command-line tools, then retry. Copy APK to `/Users/justradr/Downloads/FLO-release.apk` for the user.

- [ ] **Step 5: Sanity**

Confirm APK exists and is signed:

```bash
ls -lh android/app/build/outputs/apk/release/app-release.apk
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk | head
```

---

### Task 8: VPS PostgreSQL + deploy

**Files:**
- Modify: `deploy/systemd/flo-demo.service`
- Modify: `deploy/deploy-vps.sh`
- Modify: `deploy/README.md`

**Interfaces:**
- Consumes: `lighthouse.pem`, host `ubuntu@43.134.182.44`
- Produces: demo on Postgres; bootstrap admin only

- [ ] **Step 1: systemd unit**

Replace `Environment=DATABASE_URL=file:/opt/flo-logistics-src/dev.db` with:

```
EnvironmentFile=-/etc/flo-logistics/demo.env
```

Do not put secrets in the unit file. Document `/etc/flo-logistics/demo.env`:

```
DATABASE_URL=postgresql://flo:...@127.0.0.1:5432/flo
FLO_SESSION_SECRET=...
FLO_BOOTSTRAP_PASSWORD=...
NODE_ENV=production
PORT=3011
NEXT_BASE_PATH=/flo-logistics/demo
```

Keep `WorkingDirectory=/opt/flo-logistics-src` and `ExecStart` Next on `127.0.0.1:3011`.

- [ ] **Step 2: deploy script**

After rsync, remote:

1. Ensure `postgresql` is installed and database `flo` exists (create role/db if missing).
2. `cd /opt/flo-logistics-src && npm ci && npx prisma migrate deploy && npm run build`
3. Seed **once** if `user` table empty: `FLO_BOOTSTRAP_PASSWORD=... npm run db:seed`
4. `sudo systemctl restart flo-demo`

SSH using:

```bash
ssh -i /Users/justradr/Downloads/lighthouse.pem ubuntu@43.134.182.44
```

Fix pem mode `600` before SSH if OpenSSH refuses it.

- [ ] **Step 3: Health check**

```bash
curl -sI https://radr.nxtdev.xyz/flo-logistics/demo/login
curl -s https://radr.nxtdev.xyz/flo-logistics/demo/api/health
```

Expected: login 200; health `{ ok: true, db: ... }` with Postgres provider.

- [ ] **Step 4: Verify no persona cards**

Fetch login HTML and confirm it does not contain `Pick a demo persona` or `demo1234`.

---

## Spec coverage

| Spec requirement | Task |
|---|---|
| Merge GoldenBough + main installer | 1, 5 |
| PostgreSQL required | 1, 5, 8 |
| `admin@flo.demo` only seeded user | 2 |
| No personas / no `quickLogin` / no `demo1234` | 2, 3, 5 |
| Admin-created users | 4 |
| Capacitor APK → VPS URL | 6, 7 |
| Camera permission | 6 |
| Signed release APK | 7 |
| VPS Postgres + lighthouse.pem | 8 |
| No iOS / SSO / RN rewrite | (out of scope, no task) |
