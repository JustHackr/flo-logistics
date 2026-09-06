import type { Locale } from "@/lib/dictionary";
import { en } from "@/lib/dictionary/en";
import { id } from "@/lib/dictionary/id";

export const LOCALES = ["en", "id"] as const satisfies readonly Locale[];
export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "flo-locale";

export const dictionaries: Record<Locale, typeof en> = {
  en,
  id,
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
