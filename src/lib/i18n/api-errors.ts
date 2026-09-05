import { NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";

export const API_ERROR_CODES = [
  "generic",
  "network",
  "unauthorized",
  "forbidden",
  "notFound",
  "validation",
  "conflict",
  "rateLimited",
  "server",
  "timeout",
  "importFailed",
  "exportFailed",
  "vehicleNotFound",
  "orderNotFound",
  "driverNotFound",
  "connectorNotFound",
  "mapsNotConfigured",
  "aiNotConfigured",
  "aiUnreachable",
  "optimizeFailed",
  "requestFailed",
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

const CODE_TO_KEY: Record<ApiErrorCode, string> = {
  generic: "errors.generic",
  network: "errors.network",
  unauthorized: "errors.unauthorized",
  forbidden: "errors.forbidden",
  notFound: "errors.notFound",
  validation: "errors.validation",
  conflict: "errors.conflict",
  rateLimited: "errors.rateLimited",
  server: "errors.server",
  timeout: "errors.timeout",
  importFailed: "errors.importFailed",
  exportFailed: "errors.exportFailed",
  vehicleNotFound: "errors.vehicleNotFound",
  orderNotFound: "errors.orderNotFound",
  driverNotFound: "errors.driverNotFound",
  connectorNotFound: "errors.connectorNotFound",
  mapsNotConfigured: "errors.mapsNotConfigured",
  aiNotConfigured: "errors.aiNotConfigured",
  aiUnreachable: "errors.aiUnreachable",
  optimizeFailed: "errors.optimizeFailed",
  requestFailed: "errors.requestFailed",
};

export async function translateApiError(
  locale: Locale,
  code: ApiErrorCode,
  params?: Record<string, string | number>
): Promise<string> {
  const dict = await getDictionary(locale);
  return t(dict, CODE_TO_KEY[code] ?? "errors.generic", params);
}

export async function apiError(
  locale: Locale,
  code: ApiErrorCode,
  status: number,
  params?: Record<string, string | number>
): Promise<NextResponse> {
  const message = await translateApiError(locale, code, params);
  return NextResponse.json(
    { errorCode: code, error: message },
    { status }
  );
}
