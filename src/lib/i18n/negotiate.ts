import { DEFAULT_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";

type LanguagePreference = {
  tag: string;
  quality: number;
  index: number;
};

function parsePreference(value: string, index: number): LanguagePreference | null {
  const [rawTag, ...parameters] = value.trim().split(";");
  const tag = rawTag?.trim().toLowerCase();

  if (!tag) {
    return null;
  }

  let quality = 1;
  for (const parameter of parameters) {
    const match = parameter.trim().match(/^q\s*=\s*(\d*(?:\.\d+)?)$/i);
    if (match) {
      const parsed = Number(match[1]);
      quality = Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0;
      break;
    }
  }

  return { tag, quality, index };
}

export function negotiateLocale(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return DEFAULT_LOCALE;
  }

  const preferences = acceptLanguage
    .split(",")
    .map(parsePreference)
    .filter((preference): preference is LanguagePreference => preference !== null)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const preference of preferences) {
    if (preference.quality === 0) {
      continue;
    }

    const primaryTag = preference.tag.split("-")[0];
    if (isLocale(primaryTag)) {
      return primaryTag;
    }

    if (preference.tag === "*") {
      return DEFAULT_LOCALE;
    }
  }

  return DEFAULT_LOCALE;
}
