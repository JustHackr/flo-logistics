import { describe, expect, it } from "vitest";
import {
  canAccessPath,
  defaultHomeForRole,
  filterNavHrefs,
} from "./roles";

describe("rbac paths", () => {
  it("allows admin everywhere", () => {
    expect(canAccessPath("ADMIN", "/")).toBe(true);
    expect(canAccessPath("ADMIN", "/admin/mockup-data")).toBe(true);
    expect(canAccessPath("ADMIN", "/admin/process-map")).toBe(true);
    expect(canAccessPath("ADMIN", "/connectors")).toBe(true);
  });

  it("scopes ops manager to fleet, routing, AI assistant, sovereign AI and CV", () => {
    expect(canAccessPath("OPS_MANAGER", "/routing/dashboard")).toBe(true);
    expect(canAccessPath("OPS_MANAGER", "/vehicles")).toBe(true);
    expect(canAccessPath("OPS_MANAGER", "/ai/chat")).toBe(true);
    expect(canAccessPath("OPS_MANAGER", "/sovereign-ai")).toBe(true);
    expect(canAccessPath("OPS_MANAGER", "/computer-vision/tour")).toBe(true);
    expect(canAccessPath("OPS_MANAGER", "/admin/mockup-data")).toBe(false);
  });

  it("scopes driver to plan and dashboard only", () => {
    expect(canAccessPath("DRIVER", "/routing/plan")).toBe(true);
    expect(canAccessPath("DRIVER", "/routing/dashboard")).toBe(true);
    expect(canAccessPath("DRIVER", "/vehicles")).toBe(false);
    expect(canAccessPath("DRIVER", "/admin/mockup-data")).toBe(false);
    expect(canAccessPath("DRIVER", "/sovereign-ai")).toBe(false);
    expect(canAccessPath("DRIVER", "/computer-vision/tour")).toBe(false);
  });

  it("scopes warehouse to orders and CV", () => {
    expect(canAccessPath("WAREHOUSE", "/computer-vision/load-detection")).toBe(
      true,
    );
    expect(canAccessPath("WAREHOUSE", "/computer-vision/tour")).toBe(true);
    expect(canAccessPath("WAREHOUSE", "/routing/orders")).toBe(true);
    expect(canAccessPath("WAREHOUSE", "/ai/settings")).toBe(false);
    expect(canAccessPath("WAREHOUSE", "/vehicles")).toBe(false);
  });

  it("returns sensible home routes", () => {
    expect(defaultHomeForRole("DRIVER")).toBe("/routing/plan");
    expect(defaultHomeForRole("WAREHOUSE")).toBe(
      "/computer-vision/load-detection",
    );
    expect(defaultHomeForRole("OPS_MANAGER")).toBe("/control-tower");
    expect(defaultHomeForRole("ADMIN")).toBe("/");
  });

  it("matches the longest prefix only (no false positives)", () => {
    // /routing is in OPS_MANAGER but specifics like /routing/orders must match too
    expect(canAccessPath("OPS_MANAGER", "/routing/orders")).toBe(true);
    expect(canAccessPath("OPS_MANAGER", "/routing/methodology")).toBe(true);
  });

  it("filterNavHrefs drops disallowed entries", () => {
    const result = filterNavHrefs("DRIVER", [
      "/",
      "/routing/plan",
      "/vehicles",
      "/admin/mockup-data",
    ]);
    expect(result).toEqual(["/", "/routing/plan"]);
  });
});
