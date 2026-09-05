import { NextResponse, type NextRequest } from "next/server";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_MAX_AGE,
} from "@/lib/i18n/config";
import { negotiateLocale } from "@/lib/i18n/negotiate";

export function proxy(request: NextRequest): NextResponse {
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
      }
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.[^/]+$).*)",
  ],
};
