import { NextResponse } from "next/server";
import type { Role } from "./roles";
import { getSession } from "./session";

export async function requireApiRole(roles: readonly Role[]) {
  const session = await getSession();
  if (!session) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  if (!roles.includes(session.role)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true as const, session };
}
