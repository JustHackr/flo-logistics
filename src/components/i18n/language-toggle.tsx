"use client";

import { CheckIcon, Languages } from "lucide-react";
import { useI18n } from "@/components/i18n/use-i18n";
import type { Locale } from "@/lib/i18n/config";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALE_OPTIONS: Array<{ locale: Locale; labelKey: string; short: string }> =
  [
    { locale: "en", labelKey: "meta.languageEnglish", short: "EN" },
    { locale: "id", labelKey: "meta.languageIndonesian", short: "ID" },
  ];

export function LanguageToggle() {
  const { locale, t, setLocale } = useI18n();
  const shortLabel = locale === "id" ? "ID" : "EN";

  async function handleSelect(next: Locale) {
    if (next === locale) return;
    document.documentElement.lang = next;
    await setLocale(next);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            aria-label={t("meta.language")}
          />
        }
      >
        <Languages className="h-4 w-4" aria-hidden />
        <span className="text-xs font-medium tabular-nums">{shortLabel}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {LOCALE_OPTIONS.map((option) => {
          const active = option.locale === locale;
          return (
            <DropdownMenuItem
              key={option.locale}
              onClick={() => void handleSelect(option.locale)}
              className="justify-between gap-3"
            >
              <span>{t(option.labelKey)}</span>
              {active ? <CheckIcon className="h-4 w-4" aria-hidden /> : null}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
