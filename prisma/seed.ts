import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  JAKARTA_DEMO_LOCATIONS,
  JAKARTA_WAREHOUSE,
} from "../src/lib/routing/jakarta-demo-locations";
import { refreshFuelPricesFromPertamina } from "../src/lib/fuel-price-service";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const vehicles = [
  { name: "Van Pengiriman 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 8, odometerKm: 180000, kilometersPerFleet: 22500, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 450, maintenanceIntervalKm: 10000, notes: "Pengiriman urban jarak jauh" },
  { name: "Van Pengiriman 02", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 6, odometerKm: 142000, kilometersPerFleet: 23667, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 420, maintenanceIntervalKm: 10000, notes: null },
  { name: "Polytron Galvani 01", vehicleType: "car", engineType: "ev", vehicleAgeYears: 2, odometerKm: 35000, kilometersPerFleet: 17500, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 200, maintenanceIntervalKm: 15000, notes: "Kondisi baterai normal" },
  { name: "Polytron Galvani 02", vehicleType: "car", engineType: "ev", vehicleAgeYears: 3, odometerKm: 48000, kilometersPerFleet: 16000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 220, maintenanceIntervalKm: 15000, notes: null },
  { name: "Motor Kurir 01", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 42000, kilometersPerFleet: 14000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 120, maintenanceIntervalKm: 5000, notes: "Unit pengiriman last-minute" },
  { name: "Motor Kurir 02", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 5, odometerKm: 68000, kilometersPerFleet: 13600, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 135, maintenanceIntervalKm: 5000, notes: null },
  { name: "Motor Kurir 03", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 2, odometerKm: 28000, kilometersPerFleet: 14000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 110, maintenanceIntervalKm: 5000, notes: "Pengadaan baru" },
  { name: "Sedan Penjualan 01", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 72000, kilometersPerFleet: 18000, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 280, maintenanceIntervalKm: 10000, notes: "Tim penjualan regional" },
  { name: "Sedan Penjualan 02", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 7, odometerKm: 115000, kilometersPerFleet: 16429, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 310, maintenanceIntervalKm: 10000, notes: null },
  { name: "SUV Eksekutif 01", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 5, odometerKm: 85000, kilometersPerFleet: 17000, vehicleLifetimeYears: 14, expectedLifetimeKm: 300000, maintenanceCostUnit: 520, maintenanceIntervalKm: 12000, notes: "Transport eksekutif" },
  { name: "Truk Gudang 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 10, odometerKm: 245000, kilometersPerFleet: 24500, vehicleLifetimeYears: 15, expectedLifetimeKm: 400000, maintenanceCostUnit: 680, maintenanceIntervalKm: 8000, notes: "Operasi muatan berat" },
  { name: "Truk Gudang 02", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 12, odometerKm: 268000, kilometersPerFleet: 22333, vehicleLifetimeYears: 15, expectedLifetimeKm: 400000, maintenanceCostUnit: 720, maintenanceIntervalKm: 8000, notes: "Mendekati akhir masa pakai" },
  { name: "Motor Patroli 01", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 6, odometerKm: 55000, kilometersPerFleet: 9167, vehicleLifetimeYears: 10, expectedLifetimeKm: 100000, maintenanceCostUnit: 145, maintenanceIntervalKm: 5000, notes: "Patroli keamanan" },
  { name: "Motor Patroli 02", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 8, odometerKm: 78000, kilometersPerFleet: 9750, vehicleLifetimeYears: 10, expectedLifetimeKm: 100000, maintenanceCostUnit: 160, maintenanceIntervalKm: 5000, notes: null },
  { name: "Van Servis 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 4, odometerKm: 95000, kilometersPerFleet: 23750, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 390, maintenanceIntervalKm: 10000, notes: "Tim servis lapangan" },
  { name: "Van Servis 02", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 3, odometerKm: 62000, kilometersPerFleet: 20667, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 360, maintenanceIntervalKm: 10000, notes: null },
  { name: "Polytron Galvani 03", vehicleType: "car", engineType: "ev", vehicleAgeYears: 1, odometerKm: 12000, kilometersPerFleet: 12000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 180, maintenanceIntervalKm: 15000, notes: "Kendaraan pool" },
  { name: "Polytron Galvani 04", vehicleType: "car", engineType: "ev", vehicleAgeYears: 2, odometerKm: 28000, kilometersPerFleet: 14000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 195, maintenanceIntervalKm: 15000, notes: null },
  { name: "Polytron Fox 01", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 1, odometerKm: 8600, kilometersPerFleet: 8600, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 95, maintenanceIntervalKm: 5000, notes: "Motor listrik last-mile" },
  { name: "Hatchback 01", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 9, odometerKm: 148000, kilometersPerFleet: 16444, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 340, maintenanceIntervalKm: 10000, notes: null },
  { name: "Hatchback 02", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 11, odometerKm: 172000, kilometersPerFleet: 15636, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 380, maintenanceIntervalKm: 10000, notes: "Perlu inspeksi rem" },
  { name: "Motor Kargo 01", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 36000, kilometersPerFleet: 9000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 125, maintenanceIntervalKm: 5000, notes: "Pengiriman kargo ringan" },
  { name: "Motor Kargo 02", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 7, odometerKm: 89000, kilometersPerFleet: 12714, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 155, maintenanceIntervalKm: 5000, notes: null },
  { name: "Sedan Armada 03", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 6, odometerKm: 98000, kilometersPerFleet: 16333, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 295, maintenanceIntervalKm: 10000, notes: null },
  { name: "Sedan Armada 04", vehicleType: "car", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 54000, kilometersPerFleet: 18000, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 265, maintenanceIntervalKm: 10000, notes: null },
  { name: "Truk Jarak Jauh 01", vehicleType: "car", engineType: "diesel", vehicleAgeYears: 14, odometerKm: 310000, kilometersPerFleet: 22143, vehicleLifetimeYears: 15, expectedLifetimeKm: 400000, maintenanceCostUnit: 850, maintenanceIntervalKm: 8000, notes: "Aset kritis — pantau ketat" },
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
    prisma.dataConnector.create({
      data: {
        name: "Blibli OMS",
        type: "oms",
        status: "planned",
        description: "Order Management System integration — planned for a future release.",
        config: JSON.stringify({
          endpointUrl: "https://oms.blibli.example.com/api/v1",
          pollingIntervalMinutes: 15,
        }),
      },
    }),
    prisma.dataConnector.create({
      data: {
        name: "Blibli WMS",
        type: "wms",
        status: "planned",
        description: "Warehouse Management System integration — planned for a future release.",
        config: JSON.stringify({
          endpointUrl: "https://wms.blibli.example.com/api/v1",
          pollingIntervalMinutes: 30,
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
      name: JAKARTA_WAREHOUSE.name,
      address: JAKARTA_WAREHOUSE.address,
      lat: JAKARTA_WAREHOUSE.lat,
      lng: JAKARTA_WAREHOUSE.lng,
    },
  });

  // Dedicated vehicles for demo drivers (Jakarta last-mile fleet).
  const andiVehicle = await prisma.vehicle.create({
    data: {
      name: "B 1721 KXP – Daihatsu Gran Max",
      vehicleType: "car",
      engineType: "gasoline",
      vehicleAgeYears: 4,
      odometerKm: 78600,
      kilometersPerFleet: 19650,
      vehicleLifetimeYears: 12,
      expectedLifetimeKm: 280000,
      maintenanceCostUnit: 385000,
      maintenanceIntervalKm: 10000,
      dataSource: "manual",
      notes: "Assigned to Andi Pratama · EMP-BLI-2401 · SIM B1",
      lastMaintenanceDate: daysAgo(45),
      nextMaintenanceDate: daysFromNow(20),
    },
  });

  const bimaVehicle = await prisma.vehicle.create({
    data: {
      name: "B 6358 RXH – Honda BeAT",
      vehicleType: "motorcycle",
      engineType: "gasoline",
      vehicleAgeYears: 2,
      odometerKm: 21400,
      kilometersPerFleet: 10700,
      vehicleLifetimeYears: 10,
      expectedLifetimeKm: 120000,
      maintenanceCostUnit: 145000,
      maintenanceIntervalKm: 5000,
      dataSource: "manual",
      notes: "Assigned to Bima Nugraha · EMP-BLI-2402 · SIM C",
      lastMaintenanceDate: daysAgo(18),
      nextMaintenanceDate: daysFromNow(35),
    },
  });

  const sitiVehicle = await prisma.vehicle.create({
    data: {
      name: "B 9412 PJE – Polytron Galvani",
      vehicleType: "car",
      engineType: "ev",
      vehicleAgeYears: 1.5,
      odometerKm: 29800,
      kilometersPerFleet: 19867,
      vehicleLifetimeYears: 12,
      expectedLifetimeKm: 250000,
      maintenanceCostUnit: 210000,
      maintenanceIntervalKm: 15000,
      dataSource: "manual",
      notes: "Assigned to Siti Rahma · EMP-BLI-2403 · SIM B1",
      lastMaintenanceDate: daysAgo(22),
      nextMaintenanceDate: daysFromNow(40),
    },
  });

  const jokoVehicle = await prisma.vehicle.create({
    data: {
      name: "B 4820 MKL – Yamaha NMAX",
      vehicleType: "motorcycle",
      engineType: "gasoline",
      vehicleAgeYears: 3,
      odometerKm: 35600,
      kilometersPerFleet: 11867,
      vehicleLifetimeYears: 10,
      expectedLifetimeKm: 120000,
      maintenanceCostUnit: 160000,
      maintenanceIntervalKm: 5000,
      dataSource: "manual",
      notes: "Assigned to Joko Santoso · EMP-BLI-2404 · SIM C",
      lastMaintenanceDate: daysAgo(30),
      nextMaintenanceDate: daysFromNow(12),
    },
  });

  const rinaVehicle = await prisma.vehicle.create({
    data: {
      name: "B 3107 LSF – Suzuki Carry Diesel",
      vehicleType: "car",
      engineType: "diesel",
      vehicleAgeYears: 6,
      odometerKm: 142500,
      kilometersPerFleet: 23750,
      vehicleLifetimeYears: 15,
      expectedLifetimeKm: 350000,
      maintenanceCostUnit: 420000,
      maintenanceIntervalKm: 10000,
      dataSource: "manual",
      notes: "Assigned to Rina Wulandari · EMP-BLI-2405 · SIM B1",
      lastMaintenanceDate: daysAgo(55),
      nextMaintenanceDate: daysFromNow(8),
    },
  });

  await prisma.driver.createMany({
    data: [
      {
        name: "Andi Pratama",
        phone: "+62 812-3456-7801",
        employeeId: "EMP-BLI-2401",
        licenseNumber: "SIM B1 3175-120988-0001",
        status: "available",
        vehicleId: andiVehicle.id,
      },
      {
        name: "Bima Nugraha",
        phone: "+62 813-7788-2202",
        employeeId: "EMP-BLI-2402",
        licenseNumber: "SIM C 3175-150395-0044",
        status: "available",
        vehicleId: bimaVehicle.id,
      },
      {
        name: "Siti Rahma",
        phone: "+62 812-9001-3344",
        employeeId: "EMP-BLI-2403",
        licenseNumber: "SIM B1 3175-220491-0018",
        status: "available",
        vehicleId: sitiVehicle.id,
      },
      {
        name: "Joko Santoso",
        phone: "+62 857-2211-9088",
        employeeId: "EMP-BLI-2404",
        licenseNumber: "SIM C 3175-080388-0072",
        status: "available",
        vehicleId: jokoVehicle.id,
      },
      {
        name: "Rina Wulandari",
        phone: "+62 819-5566-7711",
        employeeId: "EMP-BLI-2405",
        licenseNumber: "SIM B1 3175-040290-0033",
        status: "available",
        vehicleId: rinaVehicle.id,
      },
    ],
  });

  const now = new Date();
  const seedOrders = JAKARTA_DEMO_LOCATIONS.slice(0, 12).map((loc, idx) => ({
    recipientAddress: loc.address,
    lat: loc.lat,
    lng: loc.lng,
    accessRequirement: loc.accessRequirement,
    receivedAtOffsetDays: [0.2, 0.4, 0.1, 0.3, 0.6, 0.7, 0.25, 0.35, 0.8, 0.45, 0.55, 0.15][idx] ?? 0.3,
  }));

  const createdOrderIds: string[] = [];

  // Create orders + a single initial status event each.
  for (const [idx, o] of seedOrders.entries()) {
    const receivedAt = new Date(now);
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

    createdOrderIds.push(order.id);

    await prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: "RECEIVED",
        timestamp: receivedAt,
      },
    });

    void idx;
  }

  // Demo completed route with DTI/CFI sample data
  const demoDriver = await prisma.driver.findFirst({
    where: { name: "Andi Pratama" },
    include: { vehicle: true },
  });

  if (demoDriver && createdOrderIds.length >= 4) {
    const demoOrderIds = createdOrderIds.slice(0, 4);
    const demoOrders = await prisma.order.findMany({
      where: { id: { in: demoOrderIds } },
    });

    const routeStartAt = new Date(now);
    routeStartAt.setHours(routeStartAt.getHours() - 3);

    const routePlan = await prisma.routePlan.create({
      data: {
        status: "IN_PROGRESS",
        routeStartAt,
        warehouseId: warehouse.id,
        driverId: demoDriver.id,
        totalDistanceKm: 18.4,
        totalDurationMin: 95,
        estimatedEmissionsKg: 2.76,
      },
    });

    const etaOffsetsMin = [35, 55, 78, 92];
    const deliveredSlackMin = [0, 25, -8, 40];

    for (let i = 0; i < demoOrders.length; i++) {
      const order = demoOrders[i];
      const etaAt = new Date(routeStartAt);
      etaAt.setMinutes(etaAt.getMinutes() + etaOffsetsMin[i]);

      await prisma.routeStop.create({
        data: {
          routePlanId: routePlan.id,
          orderId: order.id,
          sequence: i + 1,
          etaAt,
          distanceKm: 3.2 + i * 1.1,
          durationMin: 10 + i * 4,
        },
      });

      const deliveredAt = new Date(etaAt);
      deliveredAt.setMinutes(deliveredAt.getMinutes() + deliveredSlackMin[i]);

      await prisma.order.update({
        where: { id: order.id },
        data: {
          routePlanId: routePlan.id,
          status: "DELIVERED",
          preparingAt: new Date(routeStartAt.getTime() + 15 * 60_000),
          onRouteAt: new Date(routeStartAt.getTime() + 25 * 60_000),
          etaAt,
          deliveredAt,
        },
      });

      await prisma.orderStatusEvent.createMany({
        data: [
          { orderId: order.id, status: "PREPARING", timestamp: new Date(routeStartAt.getTime() + 15 * 60_000) },
          { orderId: order.id, status: "ON_ROUTE", timestamp: new Date(routeStartAt.getTime() + 25 * 60_000) },
          { orderId: order.id, status: "ETA", timestamp: etaAt },
          { orderId: order.id, status: "DELIVERED", timestamp: deliveredAt },
        ],
      });
    }
  }

  const driverCount = await prisma.driver.count();
  const vehicleCount = await prisma.vehicle.count();
  const fuelSnapshot = await refreshFuelPricesFromPertamina();
  console.log(
    `Seeded ${vehicleCount} vehicles, 5 connectors, 1 warehouse (${warehouse.name}), ${driverCount} drivers, ${seedOrders.length} orders, and fuel prices (${fuelSnapshot.items.length} products, fetched ${fuelSnapshot.fetchedAt}).`
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
