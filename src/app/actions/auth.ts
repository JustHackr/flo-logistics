"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { isRole, defaultHomeForRole, type Role } from "@/lib/auth/roles";
import {
  encodeSession,
  sessionCookieOptions,
  SESSION_COOKIE,
} from "@/lib/auth/session-token";

export type LoginState = {
  error?: string;
} | undefined;

async function setSessionCookie(user: {
  id: string;
  email: string;
  name: string;
  role: string;
}): Promise<Role> {
  if (!isRole(user.role)) {
    throw new Error("Invalid role");
  }
  const role = user.role;
  const token = encodeSession({
    id: user.id,
    email: user.email,
    name: user.name,
    role,
  });
  const cookieStore = await cookies();
  const opts = sessionCookieOptions(token);
  cookieStore.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return role;
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = sanitizeNext(String(formData.get("next") ?? ""));

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "Invalid email or password." };
  }

  const role = await setSessionCookie(user);
  redirect(next ?? defaultHomeForRole(role));
}

/** Sign in via a one-click demo persona. Never called if the seed is missing. */
export async function quickLoginAction(
  email: string,
): Promise<LoginState> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    return { error: "Demo account not found. Re-seed the database." };
  }
  const role = await setSessionCookie(user);
  redirect(defaultHomeForRole(role));
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  redirect("/login");
}

/** Only allow same-origin paths starting with `/` and not `/login` or auth pages. */
function sanitizeNext(raw: string): string | null {
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;
  if (raw === "/login" || raw.startsWith("/login/")) return null;
  return raw;
}
