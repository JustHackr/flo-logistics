export function calculateReturnEconomics(input: { distanceKm?: number; itemValue?: number; disposition?: string; repairCost?: number; recycleCost?: number }) {
  const distanceKm = input.distanceKm ?? 18;
  const itemValue = input.itemValue ?? 650000;
  const reverseTransport = Math.round(distanceKm * 2200);
  const pickup = 12000;
  const hubLabor = 9000;
  const inspection = 7000;
  const repack = input.disposition === "RESTOCK" ? 5000 : 0;
  const repair = input.disposition === "REPAIR" ? input.repairCost ?? 45000 : 0;
  const recycle = input.disposition === "RECYCLE" ? input.recycleCost ?? 12000 : 0;
  const totalCost = pickup + reverseTransport + hubLabor + inspection + repack + repair + recycle;
  const recoveryValue = input.disposition === "RESTOCK" ? itemValue : input.disposition === "REPAIR" ? Math.round(itemValue * 0.8) : 0;
  const netRecovery = recoveryValue - totalCost;
  const carbonKg = Number((distanceKm * 0.18 + (hubLabor + inspection) / 10000 * 0.08 + (repair ? 0.9 : 0) + (recycle ? 0.35 : 0)).toFixed(2));
  return { pickup, reverseTransport, hubLabor, inspection, repack, repair, recycle, totalCost, recoveryValue, netRecovery, carbonKg, isEstimate: true, assumptions: { currency: "IDR", distanceKm, itemValue, vehicleFactorKgPerKm: 0.18 } };
}
