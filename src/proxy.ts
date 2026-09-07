import { NextResponse, type NextRequest } from "next/server";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_MAX_AGE,
} from "@/lib/i18n/config";
import { negotiateLocale } from "@/lib/i18n/negotiate";
import {
  decodeSession,
  SESSION_COOKIE,
} from "@/lib/auth/session-token";
import {
  canAccessPath,
  defaultHomeForRole,
} from "@/lib/auth/roles";

const PUBLIC_PATHS = ["/login"];

/** Paths under /login are reachable unauthenticated. /api/* is excluded by the matcher. */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;
  const session = decodeSession(
    request.cookies.get(SESSION_COOKIE)?.value,
  );

  if (!isPublicPath(pathname)) {
    if (!session) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      // Only forward same-origin `/`-prefixed paths.
      const next = searchParams.get("next");
      loginUrl.search = "";
      if (next && next.startsWith("/") && !next.startsWith("//")) {
        loginUrl.searchParams.set("next", next);
      }
      return NextResponse.redirect(loginUrl);
    }
    if (!canAccessPath(session.role, pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = defaultHomeForRole(session.role);
      homeUrl.search = "";
      return NextResponse.redirect(homeUrl);
    }
  }

  const response = NextResponse.next();
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;

  if (!isLocale(cookieLocale)) {
    response.cookies.set(
      LOCALE_COOKIE,
      negotiateLocale(request.headers.get("accept-language")),
      {
        maxAge: LOCALE_MAX_AGE,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};
