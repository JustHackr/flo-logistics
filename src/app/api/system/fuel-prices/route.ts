import { NextResponse } from "next/server";
import {
  getLatestFuelPriceSnapshot,
  listFuelPriceSnapshots,
  refreshFuelPricesFromPertamina,
} from "@/lib/fuel-price-service";

export async function GET() {
  const [latest, history] = await Promise.all([
    getLatestFuelPriceSnapshot(),
    listFuelPriceSnapshots(8),
  ]);

  return NextResponse.json({ latest, history });
}

export async function POST() {
  try {
    const snapshot = await refreshFuelPricesFromPertamina();
    return NextResponse.json({ snapshot });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to refresh Pertamina fuel prices",
      },
      { status: 500 }
    );
  }
}
