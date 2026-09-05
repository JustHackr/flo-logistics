export type TranslationDictionary = {
  [key: string]: string | TranslationDictionary;
};

export type TranslationParams = Record<string, string | number>;

function readTranslation(
  dictionary: TranslationDictionary,
  key: string
): string | undefined {
  let value: string | TranslationDictionary = dictionary;

  for (const segment of key.split(".")) {
    if (typeof value === "string" || !(segment in value)) {
      return undefined;
    }
    value = value[segment];
  }

  return typeof value === "string" ? value : undefined;
}

export function t(
  dictionary: TranslationDictionary,
  key: string,
  params?: TranslationParams,
  fallbackDict?: TranslationDictionary
): string {
  const template =
    readTranslation(dictionary, key) ??
    (fallbackDict ? readTranslation(fallbackDict, key) : undefined) ??
    key;

  if (!params) {
    return template;
  }

  return template.replace(/\{([^{}]+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name)
      ? String(params[name])
      : match
  );
}
