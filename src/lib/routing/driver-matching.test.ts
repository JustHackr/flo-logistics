import { describe, expect, it } from "vitest";
import { rankDriversByVqi } from "./driver-matching";

const drivers = [
  {
    id: "d1",
    name: "Andi",
    phone: "+628111111111",
    employeeId: "EMP-1",
    licenseNumber: "SIM-1",
    status: "active",
    vehicle: {
      id: "v1",
      name: "Van A",
      vehicleType: "car",
      engineType: "diesel",
      odometerKm: 50000,
      vehicleAgeYears: 3,
      maintenanceCostUnit: 1200,
    },
    vehicleEnriched: { vqi: 72, riskLevel: "medium" as const, recommendedAction: null },
  },
  {
    id: "d2",
    name: "Rina",
    phone: "+628222222222",
    employeeId: "EMP-2",
    licenseNumber: "SIM-2",
    status: "active",
    vehicle: {
      id: "v2",
      name: "Van B",
      vehicleType: "car",
      engineType: "gasoline",
      odometerKm: 40000,
      vehicleAgeYears: 2,
      maintenanceCostUnit: 900,
    },
    vehicleEnriched: { vqi: 87, riskLevel: "low" as const, recommendedAction: null },
  },
  {
    id: "d3",
    name: "Bima",
    phone: "+628333333333",
    employeeId: "EMP-3",
    licenseNumber: "SIM-3",
    status: "active",
    vehicle: {
      id: "v3",
      name: "Bike A",
      vehicleType: "motorcycle",
      engineType: "gasoline",
      odometerKm: 15000,
      vehicleAgeYears: 1,
      maintenanceCostUnit: 400,
    },
    vehicleEnriched: { vqi: 91, riskLevel: "low" as const, recommendedAction: null },
  },
];

describe("rankDriversByVqi", () => {
  it("selects highest VQI car driver", () => {
    const result = rankDriversByVqi(drivers, "car");
    expect(result?.selectedDriverId).toBe("d2");
    expect(result?.candidates[0].vqi).toBe(87);
    expect(result?.selectionReason).toContain("Highest VQI");
  });

  it("returns null when no drivers of type", () => {
    expect(rankDriversByVqi([], "car")).toBeNull();
  });
});
