import { createHmac, timingSafeEqual } from "node:crypto";
import { isRole, type Role, type SessionUser } from "@/lib/auth/roles";

export const SESSION_COOKIE = "flo_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 12; // 12 hours

type SessionPayload = {
  id: string;
  email: string;
  name: string;
  role: Role;
  exp: number;
};

function sessionSecret(): string {
  return (
    process.env.FLO_SESSION_SECRET ??
    process.env.AUTH_SECRET ??
    "flo-demo-session-secret-change-me"
  );
}

function sign(data: string): string {
  return createHmac("sha256", sessionSecret()).update(data).digest("base64url");
}

export function encodeSession(user: SessionUser): string {
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SEC,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

export function decodeSession(
  token: string | undefined | null,
): SessionUser | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!isRole(payload.role)) return null;
    if (!payload.id || !payload.email || !payload.name) return null;
    return {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  };
}
