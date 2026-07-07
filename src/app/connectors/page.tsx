import { prisma } from "@/lib/prisma";
import { ConnectorsClient } from "@/components/connectors-client";

export default async function ConnectorsPage() {
  const connectors = await prisma.dataConnector.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { vehicles: true } } },
  });

  return <ConnectorsClient initialConnectors={connectors} />;
}
