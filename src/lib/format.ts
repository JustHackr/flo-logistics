import { format } from "date-fns";
import { enUS, id as idLocale } from "date-fns/locale";
import {
  DEFAULT_LOCALE,
  toIntlLocale,
  type Locale,
} from "@/lib/i18n/config";

function resolveLocale(locale?: Locale): Locale {
  return locale ?? DEFAULT_LOCALE;
}

function dateFnsLocale(locale: Locale) {
  return locale === "id" ? idLocale : enUS;
}

export function formatDate(
  value: string | Date | null | undefined,
  locale: Locale = DEFAULT_LOCALE
) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMM yyyy", { locale: dateFnsLocale(locale) });
}

export function formatNumber(
  value: number,
  decimals = 0,
  locale: Locale = DEFAULT_LOCALE
) {
  return value.toLocaleString(toIntlLocale(resolveLocale(locale)), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(
  value: number,
  locale: Locale = DEFAULT_LOCALE
) {
  return value.toLocaleString(toIntlLocale(resolveLocale(locale)), {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCurrencyShort(
  value: number,
  locale: Locale = DEFAULT_LOCALE
) {
  const loc = resolveLocale(locale);
  if (Math.abs(value) >= 1_000_000_000) {
    return loc === "id"
      ? `Rp ${formatNumber(value / 1_000_000_000, 1, loc)} M`
      : `Rp ${formatNumber(value / 1_000_000_000, 1, loc)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return loc === "id"
      ? `Rp ${formatNumber(value / 1_000_000, 1, loc)} jt`
      : `Rp ${formatNumber(value / 1_000_000, 1, loc)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return loc === "id"
      ? `Rp ${formatNumber(value / 1_000, 0, loc)} rb`
      : `Rp ${formatNumber(value / 1_000, 0, loc)}K`;
  }
  return `Rp ${formatNumber(value, 0, loc)}`;
}

export function formatKm(value: number, locale: Locale = DEFAULT_LOCALE) {
  return `${formatNumber(value, 0, locale)} km`;
}

export function toInputDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}
