import "server-only";

import type en from "@/messages/en.json";
import type { Locale } from "@/lib/i18n/config";

export type Dictionary = typeof en;

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  en: async () => (await import("@/messages/en.json")).default,
  id: async () => (await import("@/messages/id.json")).default,
};

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]();
}
