import { notFound } from "next/navigation";
import { ReturnsClient } from "@/components/returns/returns-client";
import { getReturnView } from "@/lib/returns/service";
type Context = { params: Promise<{ id: string }> };
export default async function ReturnDetailPage(context: Context) {
  let row;
  try { row = await getReturnView((await context.params).id); } catch { notFound(); return null; }
  return <ReturnsClient initial={[row]} selectedId={row.id} />;
}
