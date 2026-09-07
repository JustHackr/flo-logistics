import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  JAKARTA_DEMO_LOCATIONS,
  JAKARTA_WAREHOUSE,
} from "../src/lib/routing/jakarta-demo-locations";
import { refreshFuelPricesFromPertamina } from "../src/lib/fuel-price-service";
import { hashPassword } from "../src/lib/auth/password";
import { DEMO_ACCOUNTS } from "../src/lib/auth/roles";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const vehicles = [
  // Motorcycles — gasoline (10)
  { name: "B 1234 AB – Honda Beat", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 42000, kilometersPerFleet: 14000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 120, maintenanceIntervalKm: 5000, notes: "Assigned to Bima Nugraha · EMP-BLI-2402 · SIM C" },
  { name: "B 2345 CD – Honda Vario 125", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 2, odometerKm: 28000, kilometersPerFleet: 14000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 110, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 3456 EF – Honda Scoopy", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 36000, kilometersPerFleet: 9000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 125, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 4567 GH – Honda PCX 160", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 2, odometerKm: 22000, kilometersPerFleet: 11000, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 135, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 5678 IJ – Yamaha NMAX 155", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 35600, kilometersPerFleet: 11867, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 160, maintenanceIntervalKm: 5000, notes: "Assigned to Joko Santoso · EMP-BLI-2404 · SIM C" },
  { name: "B 6789 KL – Yamaha Aerox 155", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 1, odometerKm: 14500, kilometersPerFleet: 14500, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 115, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 7890 MN – Suzuki Satria F150", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 5, odometerKm: 68000, kilometersPerFleet: 13600, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 145, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 8901 OP – Honda Beat", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 6, odometerKm: 55000, kilometersPerFleet: 9167, vehicleLifetimeYears: 10, expectedLifetimeKm: 100000, maintenanceCostUnit: 150, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 9012 QR – Honda Vario 125", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 2, odometerKm: 19800, kilometersPerFleet: 9900, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 108, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 0123 ST – Yamaha NMAX 155", vehicleType: "motorcycle", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 48200, kilometersPerFleet: 12050, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 155, maintenanceIntervalKm: 5000, notes: null },
  // Motorcycles — EV Polytron (6)
  { name: "B 1122 UV – Polytron Fox R", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 1, odometerKm: 8600, kilometersPerFleet: 8600, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 95, maintenanceIntervalKm: 5000, notes: "Assigned to Siti Rahma · EMP-BLI-2403 · SIM C" },
  { name: "B 2233 WX – Polytron Fox E", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 1, odometerKm: 7200, kilometersPerFleet: 7200, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 90, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 3344 YZ – Polytron Fox X", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 2, odometerKm: 15400, kilometersPerFleet: 7700, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 98, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 4455 AA – Polytron Fox R", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 1, odometerKm: 9100, kilometersPerFleet: 9100, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 92, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 5566 BB – Polytron Fox E", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 2, odometerKm: 12800, kilometersPerFleet: 6400, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 96, maintenanceIntervalKm: 5000, notes: null },
  { name: "B 6677 CC – Polytron Fox X", vehicleType: "motorcycle", engineType: "ev", vehicleAgeYears: 1, odometerKm: 6800, kilometersPerFleet: 6800, vehicleLifetimeYears: 10, expectedLifetimeKm: 120000, maintenanceCostUnit: 88, maintenanceIntervalKm: 5000, notes: null },
  // Vans — gasoline/diesel (8)
  { name: "B 1721 KXP – Daihatsu Gran Max", vehicleType: "van", engineType: "gasoline", vehicleAgeYears: 4, odometerKm: 78600, kilometersPerFleet: 19650, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 385, maintenanceIntervalKm: 10000, notes: "Assigned to Andi Pratama · EMP-BLI-2401 · SIM B1" },
  { name: "B 2834 DFG – Daihatsu Gran Max", vehicleType: "van", engineType: "gasoline", vehicleAgeYears: 5, odometerKm: 92000, kilometersPerFleet: 18400, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 410, maintenanceIntervalKm: 10000, notes: null },
  { name: "B 3945 HIJ – Suzuki Carry", vehicleType: "van", engineType: "gasoline", vehicleAgeYears: 3, odometerKm: 54000, kilometersPerFleet: 18000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 320, maintenanceIntervalKm: 10000, notes: null },
  { name: "B 4056 KLM – Suzuki Carry Diesel", vehicleType: "van", engineType: "diesel", vehicleAgeYears: 6, odometerKm: 142500, kilometersPerFleet: 23750, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 420, maintenanceIntervalKm: 10000, notes: "Assigned to Rina Wulandari · EMP-BLI-2405 · SIM B1" },
  { name: "B 5167 NOP – Toyota HiAce Commuter", vehicleType: "van", engineType: "diesel", vehicleAgeYears: 7, odometerKm: 168000, kilometersPerFleet: 24000, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 480, maintenanceIntervalKm: 10000, notes: null },
  { name: "B 6278 QRS – Mitsubishi L300", vehicleType: "van", engineType: "diesel", vehicleAgeYears: 8, odometerKm: 180000, kilometersPerFleet: 22500, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 450, maintenanceIntervalKm: 10000, notes: null },
  { name: "B 7389 TUV – Isuzu Traga", vehicleType: "van", engineType: "diesel", vehicleAgeYears: 5, odometerKm: 112000, kilometersPerFleet: 22400, vehicleLifetimeYears: 15, expectedLifetimeKm: 350000, maintenanceCostUnit: 440, maintenanceIntervalKm: 10000, notes: null },
  { name: "B 8490 WXY – Daihatsu Gran Max", vehicleType: "van", engineType: "gasoline", vehicleAgeYears: 2, odometerKm: 38000, kilometersPerFleet: 19000, vehicleLifetimeYears: 12, expectedLifetimeKm: 280000, maintenanceCostUnit: 295, maintenanceIntervalKm: 10000, notes: null },
  // Vans — EV (4)
  { name: "B 9501 ZAB – DFSK Gelora E", vehicleType: "van", engineType: "ev", vehicleAgeYears: 1, odometerKm: 18500, kilometersPerFleet: 18500, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 195, maintenanceIntervalKm: 15000, notes: null },
  { name: "B 0612 CDE – DFSK Gelora E", vehicleType: "van", engineType: "ev", vehicleAgeYears: 2, odometerKm: 32000, kilometersPerFleet: 16000, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 210, maintenanceIntervalKm: 15000, notes: null },
  { name: "B 1723 FGH – Wuling Formo Max EV", vehicleType: "van", engineType: "ev", vehicleAgeYears: 1, odometerKm: 14200, kilometersPerFleet: 14200, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 188, maintenanceIntervalKm: 15000, notes: null },
  { name: "B 2834 IJK – Wuling Formo Max EV", vehicleType: "van", engineType: "ev", vehicleAgeYears: 1, odometerKm: 16800, kilometersPerFleet: 16800, vehicleLifetimeYears: 12, expectedLifetimeKm: 250000, maintenanceCostUnit: 192, maintenanceIntervalKm: 15000, notes: null },
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
  const forceSeed =
    process.env.FORCE_SEED === "1" ||
    process.env.FORCE_SEED?.toLowerCase() === "true";
  const skipSeed =
    process.env.SKIP_SEED === "1" ||
    process.env.SKIP_SEED?.toLowerCase() === "true";

  if (skipSeed && !forceSeed) {
    const existingVehicles = await prisma.vehicle.count();
    if (existingVehicles > 0) {
      console.log(
        `SKIP_SEED set — leaving existing SQLite data untouched (${existingVehicles} vehicles).`
      );
      return;
    }
    console.log("SKIP_SEED set but database is empty — seeding baseline demo data.");
  }

  // Avoid wiping judge-created demo state during a hot redeploy: if any route
  // plan was touched in the last hour, keep the DB unless FORCE_SEED=1.
  if (!forceSeed) {
    const recent = await prisma.routePlan.findFirst({
      where: {
        updatedAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
      select: { id: true, updatedAt: true },
    });
    if (recent) {
      console.log(
        `Skipping seed — route plan ${recent.id} updated at ${recent.updatedAt.toISOString()} (within 1h). Set FORCE_SEED=1 to override.`
      );
      return;
    }
  }

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
  await prisma.user.deleteMany();

  for (const account of DEMO_ACCOUNTS) {
    await prisma.user.create({
      data: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash: hashPassword(account.password),
      },
    });
  }

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

  const vehicleByName = new Map<string, string>();

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const lastDaysAgo = 30 + (i % 120);
    const nextDays = i % 5 === 0 ? -14 : 15 + (i % 60);

    const created = await prisma.vehicle.create({
      data: {
        ...v,
        maintenanceCostUnit: v.maintenanceCostUnit * 1000,
        dataSource: "manual",
        lastMaintenanceDate: daysAgo(lastDaysAgo),
        nextMaintenanceDate: daysFromNow(nextDays),
      },
    });
    vehicleByName.set(v.name, created.id);
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

  const driverAssignments = [
    { name: "Andi Pratama", phone: "+62 812-3456-7801", employeeId: "EMP-BLI-2401", licenseNumber: "SIM B1 3175-120988-0001", vehicleName: "B 1721 KXP – Daihatsu Gran Max" },
    { name: "Bima Nugraha", phone: "+62 813-7788-2202", employeeId: "EMP-BLI-2402", licenseNumber: "SIM C 3175-150395-0044", vehicleName: "B 1234 AB – Honda Beat" },
    { name: "Siti Rahma", phone: "+62 812-9001-3344", employeeId: "EMP-BLI-2403", licenseNumber: "SIM C 3175-220491-0018", vehicleName: "B 1122 UV – Polytron Fox R" },
    { name: "Joko Santoso", phone: "+62 857-2211-9088", employeeId: "EMP-BLI-2404", licenseNumber: "SIM C 3175-080388-0072", vehicleName: "B 5678 IJ – Yamaha NMAX 155" },
    { name: "Rina Wulandari", phone: "+62 819-5566-7711", employeeId: "EMP-BLI-2405", licenseNumber: "SIM B1 3175-040290-0033", vehicleName: "B 4056 KLM – Suzuki Carry Diesel" },
  ];

  await prisma.driver.createMany({
    data: driverAssignments.map((d) => ({
      name: d.name,
      phone: d.phone,
      employeeId: d.employeeId,
      licenseNumber: d.licenseNumber,
      status: "available",
      vehicleId: vehicleByName.get(d.vehicleName)!,
    })),
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
          { orderId: order.id, status: "DELIVERED", timestamp: deliveredAt },
        ],
      });
    }
  }

  const driverCount = await prisma.driver.count();
  const vehicleCount = await prisma.vehicle.count();
  const userCount = await prisma.user.count();
  const fuelSnapshot = await refreshFuelPricesFromPertamina();
  console.log(
    `Seeded ${userCount} users, ${vehicleCount} vehicles, 5 connectors, 1 warehouse (${warehouse.name}), ${driverCount} drivers, ${seedOrders.length} orders, and fuel prices (${fuelSnapshot.items.length} products, fetched ${fuelSnapshot.fetchedAt}).`
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
