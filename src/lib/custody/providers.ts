import type { CustodyEventInput } from "./types";
import { demoEvents } from "./fixtures";

export type CustodyProvider = { name: string; getEvents(parcelId: string): Promise<CustodyEventInput[]> };

export class FixtureCustodyProvider implements CustodyProvider {
  name = "fixture";
  async getEvents(parcelId: string) { return demoEvents(parcelId); }
}

export class ManualCustodyProvider implements CustodyProvider {
  name = "manual";
  async getEvents() { return []; }
}

export class BlibliOmsCustodyProvider extends ManualCustodyProvider {
  name = "blibli_oms";
}

export class BlibliWmsCustodyProvider extends ManualCustodyProvider {
  name = "blibli_wms";
}

export function getCustodyProvider(): CustodyProvider {
  return process.env.BLIBLI_OMS_CUSTODY_URL || process.env.BLIBLI_WMS_CUSTODY_URL ? new BlibliOmsCustodyProvider() : new FixtureCustodyProvider();
}

