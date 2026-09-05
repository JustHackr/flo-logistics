import { cookies } from "next/headers";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  type Locale,
} from "@/lib/i18n/config";
import { negotiateLocale } from "@/lib/i18n/negotiate";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LOCALE_COOKIE)?.value;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

function readCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const cookieName = part.slice(0, separator).trim();
    if (cookieName === name) {
      const value = part.slice(separator + 1).trim();
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }

  return undefined;
}

export function getLocaleFromRequest(request: Request): Locale {
  const cookieLocale = readCookie(request.headers.get("cookie"), LOCALE_COOKIE);

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return negotiateLocale(request.headers.get("accept-language"));
}
