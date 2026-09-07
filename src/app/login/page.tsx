import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessPath, defaultHomeForRole } from "@/lib/auth/roles";
import { LoginExperience } from "./login-experience";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const session = await getSession();

  // Safe `next` param: same-origin path the current role can actually access.
  const requestedNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : null;
  const safeNext =
    session && requestedNext && canAccessPath(session.role, requestedNext)
      ? requestedNext
      : null;
  const continueHref = session
    ? (safeNext ?? defaultHomeForRole(session.role))
    : null;

  // Truthful seed counts — never hardcoded numbers.
  const [vehicleCount, orderCount, driverCount] = await Promise.all([
    prisma.vehicle.count(),
    prisma.order.count(),
    prisma.driver.count(),
  ]);

  return (
    <LoginExperience
      next={requestedNext}
      stats={{
        vehicles: vehicleCount,
        orders: orderCount,
        drivers: driverCount,
      }}
      currentUser={
        session
          ? {
              name: session.name,
              email: session.email,
              role: session.role,
              continueHref: continueHref ?? "/",
            }
          : null
      }
    />
  );
}
