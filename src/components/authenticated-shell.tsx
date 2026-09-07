"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import type { SessionUser } from "@/lib/auth/roles";

/**
 * Decides whether the chrome (sidebar + page header) should wrap the page.
 *
 * - `/login` (and anything under `/login/`) is always rendered chrome-free so
 *   the gate shows full-bleed and the signed-in card sits at the top.
 * - All other routes get the `AppShell` when there is a session, else bare
 *   children (which lets the proxy redirect unauthenticated requests to
 *   `/login` first).
 *
 * Using `usePathname()` here is intentional: it re-renders on soft navigation,
 * so the shell mounts the moment the user navigates from `/login` to `/`,
 * with no full-page reload.
 */
export function AuthenticatedShell({
  user,
  children,
}: {
  user: SessionUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const isLoginRoute =
    pathname === "/login" || pathname.startsWith("/login/");
  if (isLoginRoute || !user) {
    return <>{children}</>;
  }
  return <AppShell user={user}>{children}</AppShell>;
}
