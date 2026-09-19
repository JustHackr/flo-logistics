import { notFound } from "next/navigation";
import { CustodyClient } from "@/components/custody/custody-client";
import { getCustodyParcel } from "@/lib/custody/service";
type Context = { params: Promise<{ id: string }> };
export default async function CustodyDetailPage(context: Context) { const parcel = await getCustodyParcel((await context.params).id).catch(() => null); if (!parcel) { notFound(); return null; } return <CustodyClient initial={[parcel]} focusId={parcel.id} />; }
