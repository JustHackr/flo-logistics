"use client";

import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Truck,
  Warehouse,
  LayoutDashboard,
  Wrench,
  Route as RouteIcon,
  ScanEye,
  Sparkles,
  Loader2,
  ArrowRight,
  LogOut,
} from "lucide-react";
import {
  loginAction,
  quickLoginAction,
  logoutAction,
  type LoginState,
} from "@/app/actions/auth";
import { DEMO_ACCOUNTS, ROLES, type Role } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandPartners } from "@/components/brand-partners";
import { LanguageToggle } from "@/components/i18n/language-toggle";
import { useI18n } from "@/components/i18n/use-i18n";
import { cn } from "@/lib/utils";

type Stats = { vehicles: number; orders: number; drivers: number };
type CurrentUser = {
  name: string;
  email: string;
  role: Role;
  continueHref: string;
};

const ROLE_ICONS: Record<Role, React.ComponentType<{ className?: string }>> = {
  ADMIN: ShieldCheck,
  OPS_MANAGER: LayoutDashboard,
  DRIVER: Truck,
  WAREHOUSE: Warehouse,
};

const ROLE_ACCENT: Record<Role, string> = {
  ADMIN: "bg-primary/15 text-primary",
  OPS_MANAGER: "bg-primary/15 text-primary",
  DRIVER: "bg-primary/15 text-primary",
  WAREHOUSE: "bg-primary/15 text-primary",
};

/** Static decorative Jakarta round-trip route for the brand pane. */
function JakartaRouteArt() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 480 200"
      className="absolute inset-x-0 bottom-0 h-44 w-full text-primary/40"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="flo-route-fade" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.05" />
          <stop offset="40%" stopColor="currentColor" stopOpacity="0.6" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      <path
        className="flo-route-dash"
        d="M 20 160 C 80 40, 160 40, 200 80 S 300 180, 360 100 S 440 60, 460 110 L 460 180 L 20 180 Z"
        fill="url(#flo-route-fade)"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      {/* warehouse pin */}
      <circle cx="20" cy="160" r="6" fill="currentColor" />
      <circle cx="20" cy="160" r="3" fill="white" />
      {/* stop pins */}
      {[
        [125, 70],
        [200, 80],
        [300, 130],
        [380, 95],
        [440, 110],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="5" fill="white" stroke="currentColor" strokeWidth="1.6" />
          <circle cx={cx} cy={cy} r="1.8" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

export function LoginExperience({
  next,
  stats,
  currentUser,
}: {
  next: string | null;
  stats: Stats;
  currentUser: CurrentUser | null;
}) {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );
  const [quickPending, setQuickPending] = React.useState<Role | null>(null);
  const [quickError, setQuickError] = React.useState<string | null>(null);

  async function handleQuickLogin(email: string, role: Role) {
    setQuickError(null);
    setQuickPending(role);
    const result = await quickLoginAction(email);
    if (result?.error) {
      setQuickError(result.error);
      setQuickPending(null);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-sidebar">
      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
        {/* Brand pane */}
        <aside className="relative hidden overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
          <div className="flo-dot-grid absolute inset-0" aria-hidden />
          <JakartaRouteArt />

          <header className="relative z-10 flex items-start justify-between gap-3 px-8 pt-8">
            <BrandPartners showLabel />
            <LanguageToggle />
          </header>

          <div className="relative z-10 flex flex-1 flex-col justify-center px-8 pt-10">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary/80">
              {t("auth.eyebrow")}
            </p>
            <h1 className="mt-3 text-5xl font-semibold leading-tight tracking-tight text-primary">
              {t("chrome.appName")}
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-foreground/80">
              {t("auth.valueProp")}
            </p>

            <ul className="mt-8 grid gap-3">
              {(
                [
                  ["maintenance", Wrench],
                  ["routing", RouteIcon],
                  ["cv", ScanEye],
                ] as const
              ).map(([key, Icon], i) => (
                <li
                  key={key}
                  className="flex items-start gap-3 rounded-xl bg-card/60 p-3 ring-1 ring-foreground/5 backdrop-blur"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">
                      {t(`auth.capabilities.${key}.title`)}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                      {t(`auth.capabilities.${key}.body`)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <footer className="relative z-10 flex flex-wrap items-center gap-2 px-8 pb-8">
            <Badge
              variant="outline"
              className="border-primary/25 text-primary"
            >
              <Sparkles className="mr-1.5 h-3 w-3" />
              {t("auth.stats.live")}
            </Badge>
            <span className="rounded-full border border-primary/20 bg-primary/[0.03] px-3 py-1 text-xs text-foreground/80">
              {stats.vehicles} {t("auth.stats.vehicles")}
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/[0.03] px-3 py-1 text-xs text-foreground/80">
              {stats.orders} {t("auth.stats.orders")}
            </span>
            <span className="rounded-full border border-primary/20 bg-primary/[0.03] px-3 py-1 text-xs text-foreground/80">
              {stats.drivers} {t("auth.stats.drivers")}
            </span>
          </footer>
        </aside>

        {/* Sign-in pane */}
        <main className="relative flex flex-col">
          <div className="flex items-center justify-between px-6 pt-6 lg:hidden">
            <BrandPartners showLabel />
            <LanguageToggle />
          </div>

          <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 px-6 py-10 lg:px-10 lg:py-12">
            <div>
              <Badge variant="outline" className="border-primary/30 text-primary">
                <ShieldCheck className="mr-1.5 h-3 w-3" />
                {t("auth.demoBadge")}
              </Badge>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                {t("auth.title")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {t("auth.subtitle")}
              </p>
            </div>

            {/* Persona picker */}
            {currentUser ? (
              <SignedInCard user={currentUser} />
            ) : null}
            <section
              aria-labelledby="persona-heading"
              className="rounded-xl bg-card p-5 ring-1 ring-foreground/10"
            >
              <h3
                id="persona-heading"
                className="text-sm font-semibold tracking-tight"
              >
                {t("auth.quickTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("auth.quickHint")}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {DEMO_ACCOUNTS.map((account, i) => {
                  const Icon = ROLE_ICONS[account.role];
                  const busy = quickPending === account.role;
                  const disabled = quickPending !== null;
                  return (
                    <button
                      key={account.email}
                      type="button"
                      disabled={disabled}
                      onClick={() =>
                        handleQuickLogin(account.email, account.role)
                      }
                      aria-label={`${t("auth.signIn")} ${account.name} (${t(`auth.roles.${account.role}.name`)})`}
                      style={{ animationDelay: `${i * 60}ms` }}
                      className={cn(
                        "group flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors",
                        "hover:border-primary/40 hover:bg-primary/[0.03]",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        "disabled:opacity-60",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          ROLE_ACCENT[account.role],
                        )}
                        aria-hidden
                      >
                        {busy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-snug">
                          {account.name}
                        </span>
                        <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-primary/80">
                          {t(`auth.roles.${account.role}.name`)}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {t(`auth.roles.${account.role}.scope`)}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary/80 transition-opacity group-hover:opacity-100">
                          {busy ? t("auth.signingIn") : t("auth.loginAs")}
                          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {quickError && (
                <p
                  role="alert"
                  className="mt-3 text-xs text-destructive"
                >
                  {quickError}
                </p>
              )}
            </section>

            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted-foreground/70">
              <span className="h-px flex-1 bg-border" />
              {t("auth.orCredentials")}
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Credentials */}
            <section
              aria-labelledby="credentials-heading"
              className="rounded-xl bg-card p-5 ring-1 ring-foreground/10"
            >
              <h3
                id="credentials-heading"
                className="text-sm font-semibold tracking-tight"
              >
                {t("auth.credentialsTitle")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("auth.credentialsHint")}
              </p>
              <form action={formAction} className="mt-4 flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">{t("auth.email")}</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    placeholder="admin@flo.demo"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">{t("auth.password")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="demo1234"
                    required
                  />
                </div>
                {next && <input type="hidden" name="next" value={next} />}
                {state?.error && (
                  <p role="alert" className="text-xs text-destructive">
                    {state.error}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={pending || quickPending !== null}
                  className="h-10 w-full"
                >
                  {pending ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("auth.signingIn")}
                    </span>
                  ) : (
                    t("auth.signIn")
                  )}
                </Button>
              </form>
              <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
                {t("auth.passwordNote")}
              </p>
            </section>

            <footer className="pt-2 text-center text-[11px] text-muted-foreground/80">
              {t("auth.footer")}
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
}

// Keep the constant referenced to keep the import live for future role expansion.
void ROLES;

function SignedInCard({ user }: { user: CurrentUser }) {
  const { t } = useI18n();
  const Icon = ROLE_ICONS[user.role];
  return (
    <section
      aria-labelledby="signed-in-heading"
      className="rounded-xl bg-card p-5 ring-1 ring-primary/30"
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            ROLE_ACCENT[user.role],
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id="signed-in-heading"
            className="text-sm font-semibold tracking-tight"
          >
            {t("auth.signedIn.title")}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("auth.signedIn.hint")}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-medium text-foreground">{user.name}</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-primary/80">
              {t(`auth.roles.${user.role}.name`)}
            </span>
            <span className="text-muted-foreground/70">{user.email}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={user.continueHref}
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow",
                "transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              )}
            >
              {t("auth.signedIn.continue")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <form action={logoutAction}>
              <Button
                type="submit"
                variant="outline"
                className="h-9 px-4"
              >
                <LogOut className="mr-1.5 h-3.5 w-3.5" />
                {t("auth.signedIn.switch")}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
