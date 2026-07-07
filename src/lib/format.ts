import { format } from "date-fns";

const ID_LOCALE = "id-ID";

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "d MMM yyyy");
}

export function formatNumber(value: number, decimals = 0) {
  return value.toLocaleString(ID_LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCurrency(value: number) {
  return value.toLocaleString(ID_LOCALE, {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function formatCurrencyShort(value: number) {
  if (Math.abs(value) >= 1_000_000_000) {
    return `Rp ${formatNumber(value / 1_000_000_000, 1)} M`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `Rp ${formatNumber(value / 1_000_000, 1)} jt`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Rp ${formatNumber(value / 1_000, 0)} rb`;
  }
  return `Rp ${formatNumber(value)}`;
}

export function formatKm(value: number) {
  return `${formatNumber(value)} km`;
}

export function toInputDate(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "yyyy-MM-dd");
}
