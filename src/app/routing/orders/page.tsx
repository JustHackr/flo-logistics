import { prisma } from "@/lib/prisma";
import { OrdersClient } from "@/components/routing/orders-client";

export default async function RoutingOrdersPage() {
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
  });

  const initialOrders = orders.map((o) => ({
    id: o.id,
    recipientAddress: o.recipientAddress,
    lat: o.lat,
    lng: o.lng,
    accessRequirement: o.accessRequirement,
    status: o.status,
    receivedAt: o.receivedAt ? o.receivedAt.toISOString() : null,
    preparingAt: o.preparingAt ? o.preparingAt.toISOString() : null,
    onRouteAt: o.onRouteAt ? o.onRouteAt.toISOString() : null,
    etaAt: o.etaAt ? o.etaAt.toISOString() : null,
    deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString() : null,
  }));

  return <OrdersClient initialOrders={initialOrders} />;
}

