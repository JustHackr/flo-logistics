"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Route,
  Clock,
  Truck,
  Gauge,
  MapPinned,
  Library,
  ExternalLink,
  TrendingDown,
  Bike,
  Leaf,
  Fuel,
  FileBarChart,
  ScanEye,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RiskBadge } from "@/components/risk-badge";
import { DEFAULT_MAX_STOPS_PER_ROUTE } from "@/lib/routing/assignment";
import { describeTrafficSource } from "@/lib/routing/estimator";
import {
  DELIVERY_STOP_SERVICE_MIN,
  getJakartaMaxEffectiveSpeedKmh,
  getJakartaTrafficMultiplier,
  JAKARTA_TIMEZONE,
  OSRM_URBAN_CALIBRATION_FACTOR,
} from "@/lib/routing/traffic";
import { DTI_PENALTY_PER_MIN, DTI_THRESHOLDS } from "@/lib/routing/dti";
import { CO2_KG_PER_KM } from "@/lib/routing/cfi";
import {
  EV_KWH_PER_KM,
  FUEL_CONSUMPTION_KM_PER_LITER,
} from "@/lib/routing/fuel-cost";
import { resolveFuelProductForVehicle } from "@/lib/routing/fuel-prices";
import { JAKARTA_WAREHOUSE } from "@/lib/routing/jakarta-demo-locations";
import { useI18n } from "@/components/i18n/use-i18n";

type DriverSummary = {
  id: string;
  name: string;
  phone: string | null;
  employeeId: string | null;
  vehicleType: string;
  vehicleName: string;
  vqi: number;
  riskLevel: "low" | "medium" | "high";
};

const BENEFITS = [
  {
    icon: TrendingDown,
    key: "distance",
  },
  {
    icon: Clock,
    key: "eta",
  },
  {
    icon: Bike,
    key: "vehicle",
  },
  {
    icon: Gauge,
    key: "fleet",
  },
];

const ORDER_STATUSES = [
  { status: "RECEIVED" },
  { status: "PREPARING" },
  { status: "ON_ROUTE" },
  { status: "DELIVERED" },
];

const ACCESS_ROWS = [
  { access: "CAR_ONLY", key: "car" },
  { access: "MOTORCYCLE_ONLY", key: "motorcycle" },
  { access: "BOTH", key: "both" },
];

const TRAFFIC_SOURCES = [
  { priority: 1, source: "google_traffic", label: describeTrafficSource("google_traffic") },
  { priority: 2, source: "google", label: describeTrafficSource("google") },
  { priority: 3, source: "osrm_traffic", label: describeTrafficSource("osrm_traffic") },
  { priority: 4, source: "estimated", label: describeTrafficSource("estimated") },
];

const RUSH_ROWS = [
  { period: "peak", multiplier: "1.85×", speed: 11 },
  { period: "midday", multiplier: "1.45×", speed: 14 },
  { period: "night", multiplier: "1.05×", speed: 20 },
  { period: "weekend", multiplier: "1.20×", speed: 17 },
  { period: "normal", multiplier: "1.30×", speed: 15 },
];

const FUEL_PRODUCT_ROWS = [
  { vehicle: "motorcycleGasoline", product: "Pertalite", code: resolveFuelProductForVehicle("motorcycle", "gasoline") },
  { vehicle: "vanGasoline", product: "Pertamax", code: resolveFuelProductForVehicle("van", "gasoline") },
  { vehicle: "vanDiesel", product: "Biosolar", code: resolveFuelProductForVehicle("van", "diesel") },
  { vehicle: "motorcycleEv", product: "PLN EV charging", code: resolveFuelProductForVehicle("motorcycle", "ev") },
  { vehicle: "vanEv", product: "PLN EV charging", code: resolveFuelProductForVehicle("van", "ev") },
];

const CONSUMPTION_ROWS = [
  { vehicle: "motorcycleGasoline", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.motorcycle.gasoline },
  { vehicle: "motorcycleDiesel", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.motorcycle.diesel },
  { vehicle: "vanGasoline", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.van.gasoline },
  { vehicle: "vanDiesel", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.van.diesel },
  { vehicle: "vanEv", kwhPerKm: EV_KWH_PER_KM.van },
  { vehicle: "motorcycleEv", kwhPerKm: EV_KWH_PER_KM.motorcycle },
];

const REFERENCES = [
  {
    title: "Vehicle Routing Problem (VRP) — Wikipedia",
    key: "vrp",
    url: "https://en.wikipedia.org/wiki/Vehicle_routing_problem",
  },
  {
    title: "Open Source Routing Machine (OSRM)",
    key: "osrm",
    url: "https://project-osrm.org/",
  },
  {
    title: "Google Routes API",
    key: "google",
    url: "https://developers.google.com/maps/documentation/routes",
  },
  {
    title: "Last-mile delivery in emerging markets",
    key: "lastMile",
    url: "https://www.mckinsey.com/industries/travel-logistics-and-infrastructure/our-insights/the-last-mile-delivery-challenge-in-emerging-markets",
  },
];

export function RoutingMethodologyClient({
  drivers,
}: {
  drivers: DriverSummary[];
}) {
  const { t, locale } = useI18n();
  const [departureInput, setDepartureInput] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  });
  const [selectedDriverId, setSelectedDriverId] = useState(drivers[0]?.id ?? "");

  const departureDate = useMemo(() => new Date(departureInput), [departureInput]);

  const trafficDemo = useMemo(() => {
    if (Number.isNaN(departureDate.getTime())) return null;
    return {
      label: new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", {
        weekday: "short", hour: "2-digit", minute: "2-digit",
        timeZone: JAKARTA_TIMEZONE, hour12: false,
      }).format(departureDate),
      multiplier: getJakartaTrafficMultiplier(departureDate),
      speedKmh: getJakartaMaxEffectiveSpeedKmh(departureDate),
    };
  }, [departureDate, locale]);

  const sortedDrivers = useMemo(
    () => [...drivers].sort((a, b) => b.vqi - a.vqi),
    [drivers]
  );

  const selectedDriver =
    sortedDrivers.find((d) => d.id === selectedDriverId) ?? sortedDrivers[0];

  const vanDrivers = sortedDrivers.filter((d) => d.vehicleType === "van");
  const motorcycleDrivers = sortedDrivers.filter((d) => d.vehicleType === "motorcycle");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          {t("routing.methodology.title")}
        </h2>
        <p className="text-muted-foreground">
          {t("routing.methodology.subtitle")}
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("routing.methodology.whyOptimization")}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.key}>
              <CardHeader className="pb-2">
                <benefit.icon className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">
                  {t(`routing.methodology.benefits.${benefit.key}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {t(`routing.methodology.benefits.${benefit.key}.body`)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("routing.methodology.orderLifecycle")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {ORDER_STATUSES.map((item, idx) => (
            <div key={item.status} className="flex items-center gap-2">
              <Badge variant={idx === ORDER_STATUSES.length - 1 ? "default" : "secondary"}>
                {t(`routing.methodology.status.${item.status.toLowerCase()}`)}
              </Badge>
              {idx < ORDER_STATUSES.length - 1 && (
                <span className="text-muted-foreground">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("routing.methodology.vehicleAssignment")}</CardTitle>
            <CardDescription>
              {t("routing.methodology.maxStops", { count: DEFAULT_MAX_STOPS_PER_ROUTE })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("routing.methodology.access")}</TableHead>
                  <TableHead>{t("routing.methodology.vehicle")}</TableHead>
                  <TableHead>{t("routing.methodology.note")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACCESS_ROWS.map((row) => (
                  <TableRow key={row.access}>
                    <TableCell className="font-mono text-xs">{row.access}</TableCell>
                    <TableCell>{t(`routing.methodology.accessRows.${row.access}.vehicle`)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t(`routing.methodology.accessRows.${row.access}.note`)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("routing.methodology.routeOptimization")}</CardTitle>
            <CardDescription>
              {t("routing.methodology.routeOptimizationDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
{t("routing.methodology.optimizationSteps", { warehouse: JAKARTA_WAREHOUSE.name })}
            </pre>
            <p className="text-xs text-muted-foreground">
              {t("routing.methodology.optimizationNote")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("routing.methodology.trafficCascade")}</h3>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">{t("routing.methodology.priority")}</TableHead>
                  <TableHead>{t("routing.methodology.source")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRAFFIC_SOURCES.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell>{row.priority}</TableCell>
                    <TableCell>{row.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("routing.methodology.trafficModel")}</CardTitle>
            <CardDescription>{t("routing.methodology.timezone")}: {JAKARTA_TIMEZONE} (WIB)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("routing.methodology.period")}</TableHead>
                  <TableHead>{t("routing.methodology.durationMultiplier")}</TableHead>
                  <TableHead>{t("routing.methodology.maxSpeed")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RUSH_ROWS.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="text-sm">{t(`routing.methodology.periods.${row.period}`)}</TableCell>
                    <TableCell>{row.multiplier}</TableCell>
                    <TableCell>{row.speed} km/{locale === "id" ? "jam" : "h"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              {t("routing.methodology.calibrationNote", {
                factor: OSRM_URBAN_CALIBRATION_FACTOR,
                minutes: DELIVERY_STOP_SERVICE_MIN,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("routing.methodology.emissionsEstimate")}</CardTitle>
            <CardDescription>{t("routing.methodology.emissionsDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("routing.methodology.engine")}</TableHead>
                  <TableHead>{t("routing.methodology.factor")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(CO2_KG_PER_KM).map(([engine, factor]) => (
                  <TableRow key={engine}>
                    <TableCell className="uppercase">{engine}</TableCell>
                    <TableCell>{factor} kg/km</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Fuel className="h-5 w-5 text-primary" />
          {t("routing.methodology.fuelCostSavings")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("routing.methodology.fuelDescription")}{" "}
          <Link href="/system/gas-price" className="font-medium text-primary hover:underline">
            {t("routing.methodology.gasPriceLink")}
          </Link>
          .
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("routing.methodology.fuelMapping")}</CardTitle>
              <CardDescription>{t("routing.methodology.fuelMappingDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("routing.methodology.fleet")}</TableHead>
                    <TableHead>{t("routing.methodology.product")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FUEL_PRODUCT_ROWS.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="text-sm">{t(`routing.methodology.vehicleLabels.${row.vehicle}`)}</TableCell>
                      <TableCell>{row.product}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("routing.methodology.consumptionAssumptions")}</CardTitle>
              <CardDescription>{t("routing.methodology.consumptionDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("routing.methodology.vehicle")}</TableHead>
                    <TableHead>{t("routing.methodology.rate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONSUMPTION_ROWS.map((row) => (
                    <TableRow key={row.vehicle}>
                      <TableCell className="text-sm">{t(`routing.methodology.vehicleLabels.${row.vehicle}`)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {"kmPerLiter" in row && row.kmPerLiter != null
                          ? `${row.kmPerLiter} km/L`
                          : `${row.kwhPerKm} kWh/km`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs">
{`fuelCost = (distanceKm / kmPerLiter) × pricePerLiter   // ICE
fuelCost = distanceKm × kWhPerKm × electricityRate      // EV

baselineDistance = Σ 2 × haversine(warehouse, stop) × 1.35
savings = baselineFuelCost − optimizedFuelCost`}
            </pre>
            <p className="text-xs text-muted-foreground">
              {t("routing.methodology.baselineNote")}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("routing.methodology.demoGeography")}</h3>
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p>
                {t("routing.methodology.warehouse")}: <span className="font-medium">{JAKARTA_WAREHOUSE.name}</span>{" "}
                ({JAKARTA_WAREHOUSE.address})
              </p>
              <p className="text-muted-foreground">
                {t("routing.methodology.geographyNote")}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">{t("routing.methodology.driverSelection")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("routing.methodology.selectionDescription")}{" "}
          <Link href="/methodology" className="font-medium text-primary hover:underline">
            {t("routing.methodology.maintenanceGuide")}
          </Link>
          .
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Van ({vanDrivers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {vanDrivers.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span>{d.name}</span>
                  <RiskBadge risk={d.riskLevel} vqi={d.vqi} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("routing.methodology.motorcycle")} ({motorcycleDrivers.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {motorcycleDrivers.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <span>{d.name}</span>
                  <RiskBadge risk={d.riskLevel} vqi={d.vqi} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              {t("routing.methodology.liveTraffic")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="datetime-local"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={departureInput}
              onChange={(e) => setDepartureInput(e.target.value)}
            />
            {trafficDemo && (
              <div className="rounded-lg bg-muted p-4 text-sm space-y-1">
                <div>WIB: <span className="font-medium">{trafficDemo.label}</span></div>
                <div>{t("routing.methodology.trafficMultiplier")}: <span className="font-bold">{trafficDemo.multiplier}×</span></div>
                <div>{t("routing.methodology.maxEffectiveSpeed")}: <span className="font-bold">{trafficDemo.speedKmh} km/{locale === "id" ? "jam" : "h"}</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              {t("routing.methodology.liveDriverRanking")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedDriver && (
              <>
                <Select value={selectedDriverId} onValueChange={(v) => setSelectedDriverId(v ?? selectedDriverId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedDrivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name} — VQI {d.vqi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{selectedDriver.name}</span>
                    <RiskBadge risk={selectedDriver.riskLevel} vqi={selectedDriver.vqi} />
                  </div>
                  <div className="text-muted-foreground">{selectedDriver.vehicleName}</div>
                  <div className="capitalize text-muted-foreground">{selectedDriver.vehicleType}</div>
                  {selectedDriver.employeeId && (
                    <div className="text-xs text-muted-foreground">{selectedDriver.employeeId}</div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Library className="h-5 w-5 text-primary" />
          {t("routing.methodology.references")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("routing.methodology.referencesDescription")}
        </p>
        <Card>
          <CardContent className="space-y-4 pt-6">
            {REFERENCES.map((ref) => (
              <div key={ref.url} className="space-y-1">
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {ref.title}
                </a>
                <p className="text-xs text-muted-foreground">{t(`routing.methodology.referenceNotes.${ref.key}`)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Trip Index (DTI)</CardTitle>
            <CardDescription>{t("routing.methodology.dtiDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs">
{`plannedLead = RouteStop.etaAt − Order.receivedAt
actualLead  = Order.deliveredAt − Order.receivedAt
slack       = actualLead − plannedLead

DTI = 100 − min(100, max(0, slackMin) × ${DTI_PENALTY_PER_MIN})`}
            </pre>
            <p className="text-xs text-muted-foreground">
              {t("routing.methodology.dtiVariance")}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="destructive">{t("routing.methodology.high")} &lt; {DTI_THRESHOLDS.highBelow}</Badge>
              <Badge variant="secondary">{t("routing.methodology.medium")} {DTI_THRESHOLDS.highBelow}–{DTI_THRESHOLDS.lowAbove}</Badge>
              <Badge>{t("routing.methodology.low")} &gt; {DTI_THRESHOLDS.lowAbove}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carbon Footprint Index (CFI)</CardTitle>
            <CardDescription>{t("routing.methodology.cfiDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("routing.methodology.engine")}</TableHead>
                  <TableHead>kg CO₂/km</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(CO2_KG_PER_KM).map(([engine, factor]) => (
                  <TableRow key={engine}>
                    <TableCell className="uppercase">{engine}</TableCell>
                    <TableCell>{factor}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs">
{`CFI = 100 × (dieselKg − actualKg) / (dieselKg − evKg)`}
            </pre>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <FileBarChart className="h-5 w-5 text-primary" />
          {t("routing.methodology.reportsDashboards")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("routing.methodology.reportsDescription")}{" "}
          <Link href="/routing/reports" className="font-medium text-primary hover:underline">
            {t("routing.methodology.reportsLink")}
          </Link>
          .
        </p>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-medium text-foreground">{t("routing.methodology.routeReportRows")}</span>{" "}
              {t("routing.methodology.routeReportDetail")}
            </p>
            <p>
              <span className="font-medium text-foreground">{t("routing.methodology.deliveryReportRows")}</span>{" "}
              {t("routing.methodology.deliveryReportDetail")}
            </p>
            <p>
              <span className="font-medium text-foreground">{t("routing.methodology.orderImport")}</span> CSV
              {t("routing.methodology.orderImportDetail")}{" "}
              <code className="rounded bg-muted px-1">/public/templates/routing-orders-template.csv</code>{" "}
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ScanEye className="h-4 w-4" />
          {t("routing.methodology.cvRoadmap")}
        </div>
        <p className="mt-1">
          {t("routing.methodology.cvRoadmapDescription")}
        </p>
      </section>

      <section className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Route className="h-4 w-4" />
          {t("routing.methodology.visualizeRoutes")}
        </div>
        <p className="mt-1">
          {t("routing.methodology.visualizePrefix")} <code className="rounded bg-muted px-1">GOOGLE_MAPS_JS_API_KEY</code> ({t("routing.methodology.or")}{" "}
          <code className="rounded bg-muted px-1">GOOGLE_MAPS_API_KEY</code>) {t("routing.methodology.visualizeSuffix")}{" "}
          <Leaf className="inline h-3.5 w-3.5" /> {t("routing.methodology.emissionsPreview")}
        </p>
      </section>
    </div>
  );
}
