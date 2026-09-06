"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALES,
  dictionaries,
  isLocale,
} from "@/lib/locale";
import type { Dictionary, Locale } from "@/lib/dictionary";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (next: Locale) => void;
  toggle: () => void;
  available: readonly Locale[];
  dict: Dictionary;
  t: (path: string) => string;
  tArr: (path: string) => readonly string[];
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function parseBootLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const cookie = readCookie(LOCALE_COOKIE);
  if (cookie && isLocale(decodeURIComponent(cookie))) {
    return decodeURIComponent(cookie) as Locale;
  }
  return DEFAULT_LOCALE;
}

function lookup(dict: Dictionary, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = dict;
  for (const part of parts) {
    if (cur && typeof cur === "object" && part in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return cur;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    typeof document === "undefined" ? DEFAULT_LOCALE : parseBootLocale(),
  );

  useEffect(() => {
    const persisted = parseBootLocale();
    if (persisted !== locale) {
      setLocaleState(persisted);
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = persisted;
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    writeCookie(LOCALE_COOKIE, next);
    if (typeof document !== "undefined") {
      document.documentElement.lang = next;
    }
  }, []);

  const toggle = useCallback(() => {
    setLocale(locale === "en" ? "id" : "en");
  }, [locale, setLocale]);

  const value = useMemo<LocaleContextValue>(() => {
    const dict = dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
    const t = (path: string) => {
      const result = lookup(dict, path);
      return typeof result === "string" ? result : path;
    };
    const tArr = (path: string) => {
      const result = lookup(dict, path);
      if (Array.isArray(result)) return result as readonly string[];
      return [] as readonly string[];
    };
    return {
      locale,
      setLocale,
      toggle,
      available: LOCALES,
      dict,
      t,
      tArr,
    };
  }, [locale, setLocale, toggle]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
