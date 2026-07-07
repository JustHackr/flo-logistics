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
        dataSource: "manual",
        lastMaintenanceDate: daysAgo(lastDaysAgo),
        nextMaintenanceDate: daysFromNow(nextDays),
      },
    });
  }

  console.log(`Seeded ${vehicles.length} vehicles and 3 connectors.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
