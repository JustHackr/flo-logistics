import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const vehicles = [
  { name: "Delivery Van 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 8, odometerKm: 180000, kilometersPerFleet: 22500, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 450, maintenanceIntervalKm: 10000, notes: "High mileage urban delivery" },
  { name: "Delivery Van 02", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 6, odometerKm: 142000, kilometersPerFleet: 23667, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 420, maintenanceIntervalKm: 10000, notes: null },
  { name: "City EV 01", vehicleType: "car", engineType: "ev", vehicleAgeYears: 2, odometerKm: 35000, kilometersPerFleet: 17500, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 200, maintenanceIntervalKm: 15000, notes: "Battery health nominal" },
  { name: "City EV 02", vehicleType: "car", engineType: "ev", vehicleAgeYears: 3, odometerKm: 48000, kilometersPerFleet: 16000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 220, maintenanceIntervalKm: 15000, notes: null },
  { name: "Courier Bike 01", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 42000, kilometersPerFleet: 14000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 120, maintenanceIntervalKm: 5000, notes: "Last-minute delivery unit" },
  { name: "Courier Bike 02", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 5, odometerKm: 68000, kilometersPerFleet: 13600, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 135, maintenanceIntervalKm: 5000, notes: null },
  { name: "Courier Bike 03", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 2, odometerKm: 28000, kilometersPerFleet: 14000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 110, maintenanceIntervalKm: 5000, notes: "New acquisition" },
  { name: "Sales Sedan 01", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 72000, kilometersPerFleet: 18000, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 280, maintenanceIntervalKm: 10000, notes: "Regional sales team" },
  { name: "Sales Sedan 02", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 7, odometerKm: 115000, kilometersPerFleet: 16429, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 310, maintenanceIntervalKm: 10000, notes: null },
  { name: "Executive SUV 01", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 5, odometerKm: 85000, kilometersPerFleet: 17000, vehicleLifetimeYears: 14, expectedLifetimeKm: 300000, maintenanceCostUnit: 520, maintenanceIntervalKm: 12000, notes: "Executive transport" },
  { name: "Warehouse Truck 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 10, odometerKm: 245000, kilometersPerFleet: 24500, vehicleLifetimeYears: 15, expectedLifetimeKm: 400000, maintenanceCostUnit: 680, maintenanceIntervalKm: 8000, notes: "Heavy load operations" },
  { name: "Warehouse Truck 02", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 12, odometerKm: 268000, kilometersPerFleet: 22333, vehicleLifetimeYears: 15, expectedLifetimeKm: 400000, maintenanceCostUnit: 720, maintenanceIntervalKm: 8000, notes: "Approaching end of life" },
  { name: "Patrol Bike 01", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 6, odometerKm: 55000, kilometersPerFleet: 9167, vehicleLifetimeYears: 10, expectedLifetimeKm: 100000, maintenanceCostUnit: 145, maintenanceIntervalKm: 5000, notes: "Security patrol" },
  { name: "Patrol Bike 02", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 8, odometerKm: 78000, kilometersPerFleet: 9750, vehicleLifetimeYears: 10, expectedLifetimeKm: 100000, maintenanceCostUnit: 160, maintenanceIntervalKm: 5000, notes: null },
  { name: "Service Van 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 4, odometerKm: 95000, kilometersPerFleet: 23750, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 390, maintenanceIntervalKm: 10000, notes: "Field service team" },
  { name: "Service Van 02", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 3, odometerKm: 62000, kilometersPerFleet: 20667, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 360, maintenanceIntervalKm: 10000, notes: null },
  { name: "Compact EV 01", vehicleType: "car", engineType: "ev", vehicleAgeYears: 1, odometerKm: 12000, kilometersPerFleet: 12000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 180, maintenanceIntervalKm: 15000, notes: "Pool vehicle" },
  { name: "Compact EV 02", vehicleType: "car", engineType: "ev", vehicleAgeYears: 2, odometerKm: 28000, kilometersPerFleet: 14000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 195, maintenanceIntervalKm: 15000, notes: null },
  { name: "Hatchback 01", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 9, odometerKm: 148000, kilometersPerFleet: 16444, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 340, maintenanceIntervalKm: 10000, notes: null },
  { name: "Hatchback 02", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 11, odometerKm: 172000, kilometersPerFleet: 15636, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 380, maintenanceIntervalKm: 10000, notes: "Needs brake inspection" },
  { name: "Cargo Bike 01", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 36000, kilometersPerFleet: 9000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 125, maintenanceIntervalKm: 5000, notes: "Light cargo deliveries" },
  { name: "Cargo Bike 02", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 7, odometerKm: 89000, kilometersPerFleet: 12714, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 155, maintenanceIntervalKm: 5000, notes: null },
  { name: "Fleet Sedan 03", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 6, odometerKm: 98000, kilometersPerFleet: 16333, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 295, maintenanceIntervalKm: 10000, notes: null },
  { name: "Fleet Sedan 04", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 54000, kilometersPerFleet: 18000, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 265, maintenanceIntervalKm: 10000, notes: null },
  { name: "Long Haul Truck 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 14, odometerKm: 310000, kilometersPerFleet: 22143, vehicleLifetimeYears: 15, expectedLifetimeKm: 400000, maintenanceCostUnit: 850, maintenanceIntervalKm: 8000, notes: "Critical asset — monitor closely" },
];

function daysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  // Routing tables must be cleared before vehicles because Driver -> Vehicle uses
  // `onDelete: Restrict`.
  await prisma.routeStop.deleteMany();
  await prisma.routePlan.deleteMany();
  await prisma.orderStatusEvent.deleteMany();
  await prisma.order.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.warehouse.deleteMany();

  await prisma.vehicle.deleteMany();
  await prisma.dataConnector.deleteMany();

  const connectors = await Promise.all([
    prisma.dataConnector.create({
      data: {
        name: "IoT Sensor Hub",
        type: "iot",
        status: "planned",
        description: "Planned integration with fleet IoT gateway for live telemetry.",
        config: JSON.stringify({
          endpointUrl: "mqtt://iot-gateway.example.com",
          pollingIntervalMinutes: 15,
        }),
      },
    }),
    prisma.dataConnector.create({
      data: {
        name: "Fleet Telematics API",
        type: "telematics",
        status: "disabled",
        description: "External telematics provider for odometer and engine diagnostics.",
        config: JSON.stringify({
          endpointUrl: "https://telematics.example.com/api/v1",
          pollingIntervalMinutes: 30,
        }),
      },
    }),
    prisma.dataConnector.create({
      data: {
        name: "Nightly CSV Export",
        type: "csv_scheduled",
        status: "planned",
        description: "Scheduled CSV import from fleet management system.",
        config: JSON.stringify({
          endpointUrl: "https://storage.example.com/exports/fleet-nightly.csv",
          pollingIntervalMinutes: 1440,
        }),
      },
    }),
  ]);

  void connectors;

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const lastDaysAgo = 30 + (i % 120);
    const nextDays = i % 5 === 0 ? -14 : 15 + (i % 60);

    await prisma.vehicle.create({
      data: {
        ...v,
        // Cost values are expressed in thousands of Rupiah in the source data;
        // store them as full IDR amounts (e.g. 450 -> Rp 450.000).
        maintenanceCostUnit: v.maintenanceCostUnit * 1000,
        dataSource: "manual",
        lastMaintenanceDate: daysAgo(lastDaysAgo),
        nextMaintenanceDate: daysFromNow(nextDays),
      },
    });
  }

  // Routing demo seed
  const warehouse = await prisma.warehouse.create({
    data: {
      name: "Jakarta Main Warehouse",
      address: "Jakarta, Indonesia",
      // Center-ish location within Jakarta bounds (mock routing uses lat/lng directly).
      lat: -6.200000,
      lng: 106.816666,
    },
  });

  const carVehicle = await prisma.vehicle.findFirst({
    where: { vehicleType: "car" },
  });
  const motorcycleVehicle = await prisma.vehicle.findFirst({
    where: { vehicleType: "motorcycle" },
  });

  if (!carVehicle || !motorcycleVehicle) {
    throw new Error("Seed requires at least one car and one motorcycle vehicle");
  }

  const driverCar = await prisma.driver.create({
    data: {
      name: "Pak Andi (Car)",
      phone: "0812-0000-0001",
      status: "available",
      vehicleId: carVehicle.id,
    },
  });

  const driverMotorcycle = await prisma.driver.create({
    data: {
      name: "Mas Bima (Motorcycle)",
      phone: "0812-0000-0002",
      status: "available",
      vehicleId: motorcycleVehicle.id,
    },
  });

  const now = new Date();
  const orders: Array<{
    recipientAddress: string;
    lat: number;
    lng: number;
    accessRequirement: "CAR_ONLY" | "MOTORCYCLE_ONLY" | "BOTH";
    receivedAtOffsetDays: number;
  }> = [
    { recipientAddress: "Jl. Sudirman Block A", lat: -6.2148, lng: 106.8270, accessRequirement: "CAR_ONLY", receivedAtOffsetDays: 0.2 },
    { recipientAddress: "Jl. Gatot Subroto Rt 05", lat: -6.1946, lng: 106.8124, accessRequirement: "CAR_ONLY", receivedAtOffsetDays: 0.4 },
    { recipientAddress: "Jl. Thamrin Gang 2", lat: -6.1915, lng: 106.8343, accessRequirement: "MOTORCYCLE_ONLY", receivedAtOffsetDays: 0.1 },
    { recipientAddress: "Jl. Kuningan Raya", lat: -6.2245, lng: 106.8319, accessRequirement: "BOTH", receivedAtOffsetDays: 0.3 },
    { recipientAddress: "Jl. Menteng Lorong", lat: -6.1987, lng: 106.8331, accessRequirement: "MOTORCYCLE_ONLY", receivedAtOffsetDays: 0.6 },
    { recipientAddress: "Jl. Casablanca Dalam", lat: -6.2384, lng: 106.8605, accessRequirement: "CAR_ONLY", receivedAtOffsetDays: 0.7 },
    { recipientAddress: "Jl. Cikini Raya", lat: -6.2120, lng: 106.8432, accessRequirement: "BOTH", receivedAtOffsetDays: 0.25 },
    { recipientAddress: "Jl. Pancoran Gang Kecil", lat: -6.2662, lng: 106.8479, accessRequirement: "MOTORCYCLE_ONLY", receivedAtOffsetDays: 0.35 },
    { recipientAddress: "Jl. Kebon Sirih", lat: -6.1875, lng: 106.8237, accessRequirement: "CAR_ONLY", receivedAtOffsetDays: 0.8 },
    { recipientAddress: "Jl. Palmerah Dalam", lat: -6.2142, lng: 106.7937, accessRequirement: "BOTH", receivedAtOffsetDays: 0.45 },
    { recipientAddress: "Jl. Kebayoran Lama 11", lat: -6.2428, lng: 106.7859, accessRequirement: "CAR_ONLY", receivedAtOffsetDays: 0.55 },
    { recipientAddress: "Jl. Kelapa Gading Alley", lat: -6.1310, lng: 106.9050, accessRequirement: "MOTORCYCLE_ONLY", receivedAtOffsetDays: 0.15 },
  ];

  // Create orders + a single initial status event each.
  for (const [idx, o] of orders.entries()) {
    const receivedAt = new Date(now);
    // Spread orders a bit across time so timestamps look realistic.
    receivedAt.setHours(receivedAt.getHours() - Math.round(o.receivedAtOffsetDays * 24));

    const order = await prisma.order.create({
      data: {
        recipientAddress: o.recipientAddress,
        lat: o.lat,
        lng: o.lng,
        accessRequirement: o.accessRequirement,
        status: "RECEIVED",
        receivedAt,
      },
    });

    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: "RECEIVED",
        timestamp: receivedAt,
      },
    });

    // Keep linter quiet if idx unused (demo seed).
    void idx;
  }

  console.log(
    `Seeded ${vehicles.length} vehicles, 3 connectors, 1 warehouse, 2 drivers, and ${orders.length} orders.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
