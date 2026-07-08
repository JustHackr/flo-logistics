import { ensureFuelPriceSnapshot } from "@/lib/fuel-price-service";
import { GasPriceClient } from "@/components/system/gas-price-client";

export default async function GasPricePage() {
  const latest = await ensureFuelPriceSnapshot();
  return <GasPriceClient initialSnapshot={latest} />;
}
