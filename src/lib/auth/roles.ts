export const ROLES = ["ADMIN", "OPS_MANAGER", "DRIVER", "WAREHOUSE"] as const;

export type Role = (typeof ROLES)[number];

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/** Path prefixes each role may access. Specific prefixes are matched first. */
const ROLE_PATHS: Record<Role, string[]> = {
  ADMIN: ["*"],
  OPS_MANAGER: [
    "/",
    "/dashboard",
    "/routing",
    "/vehicles",
    "/reports",
    "/methodology",
    "/ai/chat",
    "/ai/settings",
    "/sovereign-ai",
    "/system/gas-price",
    "/computer-vision",
  ],
  DRIVER: [
    "/",
    "/routing/dashboard",
    "/routing/plan",
    "/routing/methodology",
  ],
  WAREHOUSE: [
    "/",
    "/routing/orders",
    "/routing/methodology",
    "/computer-vision",
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const allowed = ROLE_PATHS[role];
  if (allowed.includes("*")) return true;

  const path = pathname.split("?")[0] || "/";
  if (path === "/") return allowed.includes("/");

  return allowed.some((prefix) => {
    if (prefix === "/") return path === "/";
    return path === prefix || path.startsWith(`${prefix}/`);
  });
}

export function filterNavHrefs(role: Role, hrefs: string[]): string[] {
  return hrefs.filter((href) => canAccessPath(role, href));
}

export function defaultHomeForRole(role: Role): string {
  switch (role) {
    case "DRIVER":
      return "/routing/plan";
    case "WAREHOUSE":
      return "/computer-vision/load-detection";
    case "OPS_MANAGER":
      return "/routing/dashboard";
    default:
      return "/";
  }
}

/**
 * Demo accounts shipped in the seed. Role display names + scope descriptions live
 * in i18n (`auth.roles.<ROLE>`); this file holds only fields the auth layer needs.
 */
export const DEMO_ACCOUNTS: Array<{
  email: string;
  password: string;
  name: string;
  role: Role;
}> = [
  {
    email: "admin@flo.demo",
    password: "demo1234",
    name: "Demo Admin",
    role: "ADMIN",
  },
  {
    email: "ops@flo.demo",
    password: "demo1234",
    name: "Ops Manager",
    role: "OPS_MANAGER",
  },
  {
    email: "driver@flo.demo",
    password: "demo1234",
    name: "Bima Nugraha",
    role: "DRIVER",
  },
  {
    email: "warehouse@flo.demo",
    password: "demo1234",
    name: "Warehouse Lead",
    role: "WAREHOUSE",
  },
];
