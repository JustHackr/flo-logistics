import type { EngineType, VehicleType } from "@/lib/types";

export const PERTAMINA_FUEL_SOURCE_URL =
  "https://pertaminapatraniaga.com/page/harga-terbaru-bbm";

export const PERTAMINA_API_BASE = "https://pertaminapatraniaga.com/api";

export type FuelProductCode =
  | "pertalite"
  | "pertamax"
  | "pertamax_turbo"
  | "pertamax_green"
  | "dexlite"
  | "pertamina_dex"
  | "biosolar"
  | "electricity";

export type FuelPriceEntry = {
  productCode: FuelProductCode;
  productName: string;
  pricePerLiter: number;
  subsidy: boolean;
  engineTypes: EngineType[];
  vehicleTypes: VehicleType[];
};

export type ParsedFuelPriceSnapshot = {
  region: string;
  effectiveLabel: string | null;
  sourceUrl: string;
  fetchedAt: Date;
  fetchMethod: "pertamina_api" | "pertamina_fallback";
  items: FuelPriceEntry[];
};

/** DKI Jakarta reference prices (PBBKB 5%) aligned with Pertamina Patra Niaga July 2026 adjustments. */
export const PERTAMINA_DKI_JAKARTA_FALLBACK: Omit<
  ParsedFuelPriceSnapshot,
  "fetchedAt"
> = {
  region: "DKI Jakarta (PBBKB 5%)",
  effectiveLabel: "1 Jul 2026",
  sourceUrl: PERTAMINA_FUEL_SOURCE_URL,
  fetchMethod: "pertamina_fallback",
  items: [
    {
      productCode: "pertalite",
      productName: "Pertalite",
      pricePerLiter: 10_000,
      subsidy: true,
      engineTypes: ["gasoline"],
      vehicleTypes: ["motorcycle"],
    },
    {
      productCode: "pertamax",
      productName: "Pertamax",
      pricePerLiter: 16_250,
      subsidy: false,
      engineTypes: ["gasoline"],
      vehicleTypes: ["car"],
    },
    {
      productCode: "pertamax_turbo",
      productName: "Pertamax Turbo",
      pricePerLiter: 19_300,
      subsidy: false,
      engineTypes: ["gasoline"],
      vehicleTypes: ["car"],
    },
    {
      productCode: "pertamax_green",
      productName: "Pertamax Green 95",
      pricePerLiter: 17_000,
      subsidy: false,
      engineTypes: ["gasoline"],
      vehicleTypes: ["car"],
    },
    {
      productCode: "dexlite",
      productName: "Dexlite",
      pricePerLiter: 19_700,
      subsidy: false,
      engineTypes: ["diesel"],
      vehicleTypes: ["car"],
    },
    {
      productCode: "pertamina_dex",
      productName: "Pertamina Dex",
      pricePerLiter: 21_150,
      subsidy: false,
      engineTypes: ["diesel"],
      vehicleTypes: ["car"],
    },
    {
      productCode: "biosolar",
      productName: "Biosolar",
      pricePerLiter: 6_800,
      subsidy: true,
      engineTypes: ["diesel"],
      vehicleTypes: ["car", "motorcycle"],
    },
    {
      productCode: "electricity",
      productName: "PLN EV charging (est.)",
      pricePerLiter: 1_444,
      subsidy: false,
      engineTypes: ["ev"],
      vehicleTypes: ["car", "motorcycle"],
    },
  ],
};

function parsePriceFromText(text: string) {
  const normalized = text.replace(/\./g, "").replace(/,/g, ".");
  const match = normalized.match(/(\d{3,6})/);
  return match ? Number(match[1]) : null;
}

function extractPricesFromHtml(html: string): Partial<Record<string, number>> {
  const prices: Partial<Record<string, number>> = {};
  const patterns: Array<[string, RegExp]> = [
    ["pertalite", /pertalite[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
    ["pertamax_turbo", /pertamax turbo[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
    ["pertamax_green", /pertamax green[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
    ["pertamax", /pertamax[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
    ["dexlite", /dexlite[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
    ["pertamina_dex", /pertamina dex[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
    ["biosolar", /biosolar[^0-9]{0,40}(?:rp\.?\s*)?([\d.]+)/i],
  ];

  for (const [code, pattern] of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const value = parsePriceFromText(match[1]);
    if (value != null && value > 1000) prices[code] = value;
  }

  return prices;
}

function walkForFuelBlocks(node: unknown, prices: Partial<Record<string, number>>) {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) walkForFuelBlocks(item, prices);
    return;
  }

  const record = node as Record<string, unknown>;
  const textParts = [
    record.title,
    record.content,
    record.description,
    record.body,
    record.html,
    record.text,
  ]
    .filter((v) => typeof v === "string")
    .join(" ");

  if (textParts) {
    Object.assign(prices, extractPricesFromHtml(textParts));
  }

  for (const value of Object.values(record)) {
    walkForFuelBlocks(value, prices);
  }
}

async function fetchPertaminaPostPayload() {
  const headers = {
    Accept: "application/json, text/plain, */*",
    Referer: PERTAMINA_FUEL_SOURCE_URL,
    Origin: "https://pertaminapatraniaga.com",
    "User-Agent": "BALON/1.0 (+https://pertaminapatraniaga.com)",
  };

  const slugUrl = `${PERTAMINA_API_BASE}/v1/post/get-by-slug/page/harga-terbaru-bbm?language=id`;
  const slugRes = await fetch(slugUrl, { headers, next: { revalidate: 0 } });
  if (slugRes.ok) {
    const json = await slugRes.json();
    return json?.data?.data ?? json?.data ?? json;
  }

  const pageRes = await fetch(PERTAMINA_FUEL_SOURCE_URL, {
    headers,
    next: { revalidate: 0 },
  });
  if (!pageRes.ok) return null;
  return { html: await pageRes.text() };
}

export async function fetchPertaminaFuelPrices(): Promise<ParsedFuelPriceSnapshot> {
  const fetchedAt = new Date();
  const parsed: Partial<Record<string, number>> = {};

  try {
    const payload = await fetchPertaminaPostPayload();
    if (payload && typeof payload === "object" && "html" in payload) {
      Object.assign(parsed, extractPricesFromHtml(String(payload.html)));
    } else if (payload) {
      walkForFuelBlocks(payload, parsed);
    }
  } catch {
    // fall through to reference list
  }

  const fallbackItems = PERTAMINA_DKI_JAKARTA_FALLBACK.items;
  const mergedItems = fallbackItems.map((item) => ({
    ...item,
    pricePerLiter: parsed[item.productCode] ?? item.pricePerLiter,
  }));

  const hasLiveParse = Object.keys(parsed).length > 0;

  return {
    region: PERTAMINA_DKI_JAKARTA_FALLBACK.region,
    effectiveLabel: hasLiveParse
      ? fetchedAt.toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : PERTAMINA_DKI_JAKARTA_FALLBACK.effectiveLabel,
    sourceUrl: PERTAMINA_FUEL_SOURCE_URL,
    fetchedAt,
    fetchMethod: hasLiveParse ? "pertamina_api" : "pertamina_fallback",
    items: mergedItems,
  };
}

export function resolveFuelProductForVehicle(
  vehicleType: VehicleType,
  engineType: EngineType
): FuelProductCode {
  if (engineType === "ev") return "electricity";
  if (engineType === "diesel") {
    return vehicleType === "motorcycle" ? "biosolar" : "biosolar";
  }
  return vehicleType === "motorcycle" ? "pertalite" : "pertamax";
}

export function buildFuelPriceLookup(items: FuelPriceEntry[]) {
  const byCode = new Map<FuelProductCode, FuelPriceEntry>();
  for (const item of items) byCode.set(item.productCode, item);
  return byCode;
}

export function getFuelPriceForVehicle(
  items: FuelPriceEntry[],
  vehicleType: VehicleType,
  engineType: EngineType
) {
  const code = resolveFuelProductForVehicle(vehicleType, engineType);
  const lookup = buildFuelPriceLookup(items);
  const entry = lookup.get(code);
  return {
    productCode: code,
    productName: entry?.productName ?? code,
    pricePerLiter: entry?.pricePerLiter ?? 0,
    subsidy: entry?.subsidy ?? false,
  };
}
