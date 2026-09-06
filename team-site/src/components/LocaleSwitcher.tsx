"use client";

import { useLocale } from "@/components/LocaleProvider";

const labels: Record<string, string> = {
  en: "EN",
  id: "ID",
};

export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale, available } = useLocale();
  return (
    <div
      role="group"
      aria-label="Language"
      className={`inline-flex items-center overflow-hidden rounded-sm border border-border bg-surface ${className}`}
    >
      {available.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            aria-label={`Switch language to ${labels[code]}`}
            className={`px-2.5 py-1.5 text-xs font-semibold tracking-wide transition ${
              active
                ? "bg-blue text-white"
                : "text-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            {labels[code]}
          </button>
        );
      })}
    </div>
  );
}
