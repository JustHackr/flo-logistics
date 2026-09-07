import { cookies } from "next/headers";
import type { SessionUser } from "@/lib/auth/roles";
import { decodeSession, SESSION_COOKIE } from "@/lib/auth/session-token";

export {
  encodeSession,
  decodeSession,
  sessionCookieOptions,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
} from "@/lib/auth/session-token";

/**
 * Read the current session from the request cookie store. Returns `null` when
 * the cookie is missing, malformed, expired, or has an invalid role.
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return decodeSession(token);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
