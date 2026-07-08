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
    title: "Kurangi jarak tempuh",
    body: "Nearest-neighbor TSP mengurutkan stop dari gudang Blok M sehingga kurir tidak bolak-balik melintasi Jakarta.",
  },
  {
    icon: Clock,
    title: "ETA realistis",
    body: "Estimasi waktu memakai OSRM + kalibrasi rush hour Jakarta (06:30–10:00 & 16:00–20:00 WIB), atau Google live traffic jika API key tersedia.",
  },
  {
    icon: Bike,
    title: "Kendaraan tepat",
    body: "Stop CAR_ONLY ke mobil, MOTORCYCLE_ONLY ke motor; stop BOTH dibagi agar rute tetap feasible.",
  },
  {
    icon: Gauge,
    title: "Armada sehat",
    body: "Driver dipilih berdasarkan VQI tertinggi per tipe kendaraan — menjembatani predictive maintenance dan routing.",
  },
];

const ORDER_STATUSES = [
  { status: "RECEIVED", label: "Diterima" },
  { status: "PREPARING", label: "Disiapkan" },
  { status: "ON_ROUTE", label: "Dalam perjalanan" },
  { status: "DELIVERED", label: "Terkirim" },
];

const ACCESS_ROWS = [
  { access: "CAR_ONLY", vehicle: "Van", note: "Gang sempit tidak bisa, butuh van" },
  { access: "MOTORCYCLE_ONLY", vehicle: "Motor", note: "Gang/perumahan padat, motor lebih lincah" },
  { access: "BOTH", vehicle: "Van atau motor", note: "Dibagi ke set yang lebih ringan saat assignment" },
];

const TRAFFIC_SOURCES = [
  { priority: 1, source: "google_traffic", label: describeTrafficSource("google_traffic"), cost: "Berbayar" },
  { priority: 2, source: "google", label: describeTrafficSource("google"), cost: "Berbayar" },
  { priority: 3, source: "osrm_traffic", label: describeTrafficSource("osrm_traffic"), cost: "Gratis (demo)" },
  { priority: 4, source: "estimated", label: describeTrafficSource("estimated"), cost: "Gratis, offline" },
];

const RUSH_ROWS = [
  { period: "Puncak pagi/sore (Sen–Jum 06:30–10:00, 16:00–20:00)", multiplier: "1.85×", speed: "11 km/jam" },
  { period: "Siang (11:00–14:00)", multiplier: "1.45×", speed: "14 km/jam" },
  { period: "Malam (22:00–05:00)", multiplier: "1.05×", speed: "20 km/jam" },
  { period: "Akhir pekan", multiplier: "1.20×", speed: "17 km/jam" },
  { period: "Normal", multiplier: "1.30×", speed: "15 km/jam" },
];

const FUEL_PRODUCT_ROWS = [
  { vehicle: "Motor + bensin", product: "Pertalite", code: resolveFuelProductForVehicle("motorcycle", "gasoline") },
  { vehicle: "Van + bensin", product: "Pertamax", code: resolveFuelProductForVehicle("van", "gasoline") },
  { vehicle: "Van diesel", product: "Biosolar", code: resolveFuelProductForVehicle("van", "diesel") },
  { vehicle: "Motor EV (Polytron Fox)", product: "PLN EV charging", code: resolveFuelProductForVehicle("motorcycle", "ev") },
  { vehicle: "Van EV (DFSK / Wuling)", product: "PLN EV charging", code: resolveFuelProductForVehicle("van", "ev") },
];

const CONSUMPTION_ROWS = [
  { vehicle: "Motor bensin", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.motorcycle.gasoline },
  { vehicle: "Motor diesel", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.motorcycle.diesel },
  { vehicle: "Van bensin", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.van.gasoline },
  { vehicle: "Van diesel", kmPerLiter: FUEL_CONSUMPTION_KM_PER_LITER.van.diesel },
  { vehicle: "Van EV", kwhPerKm: EV_KWH_PER_KM.van },
  { vehicle: "Motor EV", kwhPerKm: EV_KWH_PER_KM.motorcycle },
];

const REFERENCES = [
  {
    title: "Vehicle Routing Problem (VRP) — Wikipedia",
    note: "Kerangka klasik untuk mengoptimalkan rute multi-stop dari depot.",
    url: "https://en.wikipedia.org/wiki/Vehicle_routing_problem",
  },
  {
    title: "Open Source Routing Machine (OSRM)",
    note: "Engine jarak jalan gratis yang dipakai sebagai sumber default demo.",
    url: "https://project-osrm.org/",
  },
  {
    title: "Google Routes API",
    note: "Opsional — live traffic dan polyline jalan untuk visualisasi peta.",
    url: "https://developers.google.com/maps/documentation/routes",
  },
  {
    title: "Last-mile delivery in emerging markets",
    note: "Konteks operasional last-mile di kota padat seperti Jakarta.",
    url: "https://www.mckinsey.com/industries/travel-logistics-and-infrastructure/our-insights/the-last-mile-delivery-challenge-in-emerging-markets",
  },
];

function formatWibLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: JAKARTA_TIMEZONE,
    hour12: false,
  }).format(date);
}

export function RoutingMethodologyClient({
  drivers,
}: {
  drivers: DriverSummary[];
}) {
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
      label: formatWibLabel(departureDate),
      multiplier: getJakartaTrafficMultiplier(departureDate),
      speedKmh: getJakartaMaxEffectiveSpeedKmh(departureDate),
    };
  }, [departureDate]);

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
          Routing Metrics &amp; Methodology
        </h2>
        <p className="text-muted-foreground">
          How Jakarta last-mile route optimization works — from order assignment
          and CSV import to traffic-aware ETAs, DTI/CFI delivery metrics, Pertamina
          fuel costing, and VQI-based driver dispatch.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Why route optimization?</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader className="pb-2">
                <benefit.icon className="h-6 w-6 text-primary" />
                <CardTitle className="text-base">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{benefit.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Order lifecycle</h3>
        <div className="flex flex-wrap items-center gap-2">
          {ORDER_STATUSES.map((item, idx) => (
            <div key={item.status} className="flex items-center gap-2">
              <Badge variant={idx === ORDER_STATUSES.length - 1 ? "default" : "secondary"}>
                {item.label}
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
            <CardTitle className="text-base">Vehicle assignment</CardTitle>
            <CardDescription>
              Max {DEFAULT_MAX_STOPS_PER_ROUTE} stops per route chunk.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Access</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ACCESS_ROWS.map((row) => (
                  <TableRow key={row.access}>
                    <TableCell className="font-mono text-xs">{row.access}</TableCell>
                    <TableCell>{row.vehicle}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.note}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Route optimization</CardTitle>
            <CardDescription>
              Nearest-neighbor round-trip from warehouse.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
{`1. Start at warehouse (${JAKARTA_WAREHOUSE.name})
2. Pick nearest unvisited stop (by drive time)
3. Repeat until all stops visited
4. Return to warehouse`}
            </pre>
            <p className="text-xs text-muted-foreground">
              Demo heuristic — production systems often use OR-Tools or similar
              for larger fleets. Good enough for ≤15 stops per route.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Traffic estimation cascade</h3>
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Priority</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TRAFFIC_SOURCES.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell>{row.priority}</TableCell>
                    <TableCell>{row.label}</TableCell>
                    <TableCell>{row.cost}</TableCell>
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
            <CardTitle className="text-base">Jakarta traffic model</CardTitle>
            <CardDescription>Timezone: {JAKARTA_TIMEZONE} (WIB)</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>× Duration</TableHead>
                  <TableHead>Max speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RUSH_ROWS.map((row) => (
                  <TableRow key={row.period}>
                    <TableCell className="text-sm">{row.period}</TableCell>
                    <TableCell>{row.multiplier}</TableCell>
                    <TableCell>{row.speed}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-xs text-muted-foreground">
              OSRM calibration ×{OSRM_URBAN_CALIBRATION_FACTOR}; per-stop service{" "}
              {DELIVERY_STOP_SERVICE_MIN} min (parkir + serah terima).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Emissions estimate</CardTitle>
            <CardDescription>CO₂ by engine type × total distance</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engine</TableHead>
                  <TableHead>Factor</TableHead>
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
          Trip fuel cost &amp; savings
        </h3>
        <p className="text-sm text-muted-foreground">
          Pertamina DKI Jakarta prices (live fetch or fallback) are matched to each
          vehicle type. Trip cost appears on Plan Route, Logistics Dashboard, Overview,
          and{" "}
          <Link href="/system/gas-price" className="font-medium text-primary hover:underline">
            System → Gas Price
          </Link>
          .
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fuel product mapping</CardTitle>
              <CardDescription>Vehicle type + engine → Pertamina product</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fleet</TableHead>
                    <TableHead>Product</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {FUEL_PRODUCT_ROWS.map((row) => (
                    <TableRow key={row.code}>
                      <TableCell className="text-sm">{row.vehicle}</TableCell>
                      <TableCell>{row.product}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consumption assumptions</CardTitle>
              <CardDescription>Jakarta urban last-mile averages</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONSUMPTION_ROWS.map((row) => (
                    <TableRow key={row.vehicle}>
                      <TableCell className="text-sm">{row.vehicle}</TableCell>
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
              Naive baseline models a separate warehouse round-trip per stop (no
              route sharing). Optimized routes use nearest-neighbor TSP distance.
              Demo EV fleet uses Polytron Fox (motor) and DFSK Gelora E / Wuling Formo Max EV (van).
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Demo geography</h3>
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <MapPinned className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1 text-sm">
              <p>
                Warehouse: <span className="font-medium">{JAKARTA_WAREHOUSE.name}</span>{" "}
                ({JAKARTA_WAREHOUSE.address})
              </p>
              <p className="text-muted-foreground">
                Order coordinates validated against Greater Jakarta (Jabodetabek)
                bounds. Demo addresses are paired with real street coordinates.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold">VQI driver selection</h3>
        <p className="text-sm text-muted-foreground">
          For each route chunk, the system picks the highest-VQI available driver
          of the matching vehicle type (car or motorcycle). See also{" "}
          <Link href="/methodology" className="font-medium text-primary hover:underline">
            Predictive Maintenance Metrics &amp; Guide
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
              <CardTitle className="text-base">Motor ({motorcycleDrivers.length})</CardTitle>
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
              Live demo — Jakarta traffic
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
                <div>Traffic multiplier: <span className="font-bold">{trafficDemo.multiplier}×</span></div>
                <div>Max effective speed: <span className="font-bold">{trafficDemo.speedKmh} km/jam</span></div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="h-4 w-4" />
              Live demo — driver ranking
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
          References &amp; basis
        </h3>
        <p className="text-sm text-muted-foreground">
          Routing uses rule-based heuristics adapted for Jakarta last-mile demo.
          Traffic calibration reflects typical urban delivery speeds, not real-time
          probe data unless Google Maps is connected.
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
                <p className="text-xs text-muted-foreground">{ref.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery Trip Index (DTI)</CardTitle>
            <CardDescription>End-to-end SLA: receivedAt → deliveredAt vs planned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-xs">
{`plannedLead = RouteStop.etaAt − Order.receivedAt
actualLead  = Order.deliveredAt − Order.receivedAt
slack       = actualLead − plannedLead

DTI = 100 − min(100, max(0, slackMin) × ${DTI_PENALTY_PER_MIN})`}
            </pre>
            <p className="text-xs text-muted-foreground">
              Variance drivers: traffic, weather, stop service time, warehouse prep delay,
              route deviation, vehicle reliability, address accuracy.
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="destructive">High &lt; {DTI_THRESHOLDS.highBelow}</Badge>
              <Badge variant="secondary">Medium {DTI_THRESHOLDS.highBelow}–{DTI_THRESHOLDS.lowAbove}</Badge>
              <Badge>Low &gt; {DTI_THRESHOLDS.lowAbove}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Carbon Footprint Index (CFI)</CardTitle>
            <CardDescription>100 = EV-equivalent; 0 = diesel on same distance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Engine</TableHead>
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
          Reports &amp; dashboards
        </h3>
        <p className="text-sm text-muted-foreground">
          Logistics KPIs aggregate DTI, CFI, fuel cost, and route metrics across
          active and completed routes. Charts on Overview and Logistics Dashboard;
          exportable CSV and print layout on{" "}
          <Link href="/routing/reports" className="font-medium text-primary hover:underline">
            Routing → Reports
          </Link>
          .
        </p>
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground space-y-2">
            <p>
              <span className="font-medium text-foreground">Route report rows:</span>{" "}
              route id, driver, vehicle, stops, distance, duration, DTI avg, CFI avg,
              fuel cost, savings vs naive baseline.
            </p>
            <p>
              <span className="font-medium text-foreground">Delivery report rows:</span>{" "}
              per-stop order id, status, planned vs actual lead time, DTI score,
              allocated emissions (CFI).
            </p>
            <p>
              <span className="font-medium text-foreground">Order import:</span> CSV
              template at{" "}
              <code className="rounded bg-muted px-1">/public/templates/routing-orders-template.csv</code>{" "}
              — bulk upload from Orders page.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <ScanEye className="h-4 w-4" />
          Computer Vision (roadmap)
        </div>
        <p className="mt-1">
          ODOL Detection and Hub Congestion Detection are scaffolded under Computer
          Vision in the sidebar — planned for overload monitoring and hub queue
          analytics. Routing metrics above remain independent of CV inputs today.
        </p>
      </section>

      <section className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Route className="h-4 w-4" />
          Visualize routes on Plan Route
        </div>
        <p className="mt-1">
          Set <code className="rounded bg-muted px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to
          render waypoints and road-following polylines on Google Maps. See also{" "}
          <Leaf className="inline h-3.5 w-3.5" /> emissions per route on the preview card.
        </p>
      </section>
    </div>
  );
}
