import { CustodyClient } from "@/components/custody/custody-client";
import { listCustodyParcels } from "@/lib/custody/service";
export default async function CustodyDisputesPage() { return <CustodyClient initial={await listCustodyParcels()} disputes />; }

