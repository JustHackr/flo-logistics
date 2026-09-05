"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/format";
import type { FuelPriceSnapshotView } from "@/lib/fuel-price-service";
import {
  FUEL_CONSUMPTION_KM_PER_LITER,
  EV_KWH_PER_KM,
} from "@/lib/routing/fuel-cost";
import {
  PERTAMINA_FUEL_SOURCE_URL,
  resolveFuelProductForVehicle,
} from "@/lib/routing/fuel-prices";
import { useI18n } from "@/components/i18n/use-i18n";
import { toIntlLocale } from "@/lib/i18n/config";

const VEHICLE_MAPPINGS = [
  {
    labelKey: "motorcycleGasoline",
    vehicleType: "motorcycle" as const,
    engineType: "gasoline" as const,
  },
  {
    labelKey: "vanGasoline",
    vehicleType: "van" as const,
    engineType: "gasoline" as const,
  },
  {
    labelKey: "vanDiesel",
    vehicleType: "van" as const,
    engineType: "diesel" as const,
  },
  {
    labelKey: "vanEv",
    vehicleType: "van" as const,
    engineType: "ev" as const,
  },
];

export function GasPriceClient({
  initialSnapshot,
}: {
  initialSnapshot: FuelPriceSnapshotView | null;
}) {
  const { t, locale } = useI18n();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [history, setHistory] = useState<FuelPriceSnapshotView[]>(
    initialSnapshot ? [initialSnapshot] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/system/fuel-prices", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t("errors.requestFailed"));
      setSnapshot(json.snapshot);
      setHistory((prev) => [json.snapshot, ...prev.filter((h) => h.id !== json.snapshot.id)].slice(0, 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("errors.requestFailed"));
    } finally {
      setLoading(false);
    }
  }

  if (!snapshot) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">{t("system.gas.noSnapshot")}</p>
        <Button onClick={() => void refresh()} disabled={loading}>
          {t("system.gas.loadPrices")}
        </Button>
      </div>
    );
  }

  const priceLookup = new Map(snapshot.items.map((item) => [item.productCode, item]));

  return (
    <div lang={locale} className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t("system.gas.title")}</h2>
          <p className="text-muted-foreground">
            {t("system.gas.description")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("system.gas.refreshPertamina")}
          </Button>
          <Button variant="outline" render={<Link href="/routing/dashboard" />}>
            {t("system.gas.logisticsDashboard")}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("system.gas.latestPriceList")}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span>
              {t("system.gas.fetched", {
                time: new Date(snapshot.fetchedAt).toLocaleString(
                  toIntlLocale(locale),
                  { dateStyle: "medium", timeStyle: "short" }
                ),
                region: snapshot.region,
              })}
            </span>
            {snapshot.effectiveLabel && (
              <Badge variant="secondary">{t("system.gas.effective", { label: snapshot.effectiveLabel })}</Badge>
            )}
            <Badge variant="outline">{snapshot.fetchMethod.replace("_", " ")}</Badge>
            <a
              href={PERTAMINA_FUEL_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {t("system.gas.source")} <ExternalLink className="h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("system.gas.product")}</TableHead>
                <TableHead>{t("system.gas.pricePerLiter")}</TableHead>
                <TableHead>{t("system.gas.subsidy")}</TableHead>
                <TableHead>{t("system.gas.fleetMapping")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshot.items.map((item) => (
                <TableRow key={item.productCode}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell>{formatCurrency(item.pricePerLiter, locale)}</TableCell>
                  <TableCell>{item.subsidy ? t("common.yes") : t("common.no")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {item.vehicleTypes.join(", ")} · {item.engineTypes.join(", ")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("system.gas.vehicleMatching")}</CardTitle>
          <CardDescription>
            {t("system.gas.vehicleMatchingDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("system.gas.fleetProfile")}</TableHead>
                <TableHead>{t("system.gas.pertaminaProduct")}</TableHead>
                <TableHead>{t("system.gas.price")}</TableHead>
                <TableHead>{t("system.gas.consumption")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {VEHICLE_MAPPINGS.map((mapping) => {
                const productCode = resolveFuelProductForVehicle(
                  mapping.vehicleType,
                  mapping.engineType
                );
                const product = priceLookup.get(productCode);
                const kmPerLiter =
                  mapping.engineType === "ev"
                    ? null
                    : FUEL_CONSUMPTION_KM_PER_LITER[mapping.vehicleType][
                        mapping.engineType
                      ];
                return (
                  <TableRow key={mapping.labelKey}>
                    <TableCell className="font-medium">
                      {t(`system.gas.profiles.${mapping.labelKey}`)}
                    </TableCell>
                    <TableCell>{product?.productName ?? productCode}</TableCell>
                    <TableCell>
                      {product ? formatCurrency(product.pricePerLiter, locale) : "—"}
                      {mapping.engineType === "ev" ? " / kWh" : " / L"}
                    </TableCell>
                    <TableCell>
                      {mapping.engineType === "ev"
                        ? `${EV_KWH_PER_KM[mapping.vehicleType]} kWh/km`
                        : kmPerLiter
                          ? `${kmPerLiter} km/L`
                          : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("system.gas.priceHistory")}</CardTitle>
          <CardDescription>{t("system.gas.priceHistoryDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.map((row) => (
            <div
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm"
            >
              <div>
                <span className="font-medium">
                  {new Date(row.fetchedAt).toLocaleString(toIntlLocale(locale), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
                <span className="text-muted-foreground"> · {row.region}</span>
              </div>
              <Badge variant="outline">{row.fetchMethod.replace("_", " ")}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
