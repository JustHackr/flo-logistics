import { prisma } from "@/lib/prisma";
import { ConnectorsClient } from "@/components/connectors-client";
import { getSession } from "@/lib/auth/session";

export default async function ConnectorsPage() {
  const session = await getSession();
  if (!session) return null;
  const connectors = await prisma.dataConnector.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });

  return <ConnectorsClient initialConnectors={connectors} userRole={session.role} />;
}
