"use client";

import {
  createContext,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { setLocaleAction } from "@/app/actions/locale";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/config";
import {
  t as translate,
  type TranslationParams,
} from "@/lib/i18n/t";

export type I18nContextValue = {
  locale: Locale;
  dict: Dictionary;
  t: (key: string, params?: TranslationParams) => string;
  setLocale: (locale: Locale) => Promise<void>;
};

export const I18nContext = createContext<I18nContextValue | null>(null);

type LocaleProviderProps = {
  locale: Locale;
  dict: Dictionary;
  children: ReactNode;
};

export function LocaleProvider({
  locale,
  dict,
  children,
}: LocaleProviderProps) {
  const router = useRouter();

  const translateKey = useCallback(
    (key: string, params?: TranslationParams) => translate(dict, key, params),
    [dict]
  );

  const setLocale = useCallback(
    async (nextLocale: Locale) => {
      await setLocaleAction(nextLocale);
      router.refresh();
    },
    [router]
  );

  const value = useMemo(
    () => ({ locale, dict, t: translateKey, setLocale }),
    [dict, locale, setLocale, translateKey]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
