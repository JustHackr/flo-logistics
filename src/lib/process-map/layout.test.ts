import { describe, expect, it } from "vitest";
import { autoLayout, layoutById } from "@/lib/process-map/layout";

type TestNode = {
  id: string;
  position?: { x: number; y: number };
  width?: number;
  height?: number;
  lane?: string;
  column?: "input" | "process" | "output" | "system";
};

function boxesOverlap(
  a: { x: number; y: number; width?: number; height?: number },
  b: { x: number; y: number; width?: number; height?: number },
): boolean {
  const aw = a.width ?? 240;
  const ah = a.height ?? 180;
  const bw = b.width ?? 240;
  const bh = b.height ?? 180;
  return (
    a.x < b.x + bw &&
    a.x + aw > b.x &&
    a.y < b.y + bh &&
    a.y + ah > b.y
  );
}

describe("autoLayout", () => {
  it("honors pre-set positions", () => {
    const nodes: TestNode[] = [
      { id: "a", position: { x: 100, y: 100 } },
      { id: "b", position: { x: 500, y: 200 } },
    ];
    const result = autoLayout(nodes);
    expect(result).toEqual([
      { id: "a", x: 100, y: 100 },
      { id: "b", x: 500, y: 200 },
    ]);
  });

  it("places nodes in distinct Y bands per lane", () => {
    const nodes: TestNode[] = [
      { id: "n1", lane: "customer", column: "input" },
      { id: "n2", lane: "customer", column: "process" },
      { id: "n3", lane: "support", column: "process" },
      { id: "n4", lane: "support", column: "output" },
    ];
    const result = layoutById(nodes);
    const positions = Array.from(result.values());
    expect(new Set(positions.map((p) => p.y)).size).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < positions.length; i += 1) {
      for (let j = i + 1; j < positions.length; j += 1) {
        expect(boxesOverlap(positions[i], positions[j])).toBe(false);
      }
    }
  });

  it("gives unknown lanes their own Y band", () => {
    const nodes: TestNode[] = [
      { id: "n1", lane: "customer", column: "input" },
      { id: "n2", lane: "support", column: "input" },
      { id: "n3", lane: "submit", column: "input" }, // unmapped lane
      { id: "n4", lane: "finalize", column: "input" }, // unmapped lane
    ];
    const result = layoutById(nodes);
    const ys = nodes.map((n) => result.get(n.id)!.y);
    expect(new Set(ys).size).toBe(4); // every lane gets a distinct Y
  });

  it("sorts within a lane by column priority input → process → output → system", () => {
    const nodes: TestNode[] = [
      { id: "out", lane: "ops", column: "output" },
      { id: "in", lane: "ops", column: "input" },
      { id: "proc", lane: "ops", column: "process" },
    ];
    const result = layoutById(nodes);
    // All in the same lane, so they share a row band; the x-coordinates follow
    // the column priority (input < process < output).
    expect(result.get("in")!.x).toBeLessThan(result.get("proc")!.x);
    expect(result.get("proc")!.x).toBeLessThan(result.get("out")!.x);
  });

  it("wraps wide lanes to a new row within canvasMaxX", () => {
    const nodes: TestNode[] = Array.from({ length: 12 }, (_, i) => ({
      id: `n${i}`,
      lane: "wide",
      column: "process" as const,
    }));
    const result = autoLayout(nodes, { canvasMaxX: 700 });
    const ys = new Set(result.map((p) => p.y));
    expect(ys.size).toBeGreaterThan(1); // wrapped to multiple rows
  });

  it("respects pinned and unpinned in the same input", () => {
    const nodes: TestNode[] = [
      { id: "pinned", position: { x: 9999, y: 9999 } },
      { id: "auto", lane: "ops", column: "process" },
    ];
    const result = layoutById(nodes);
    expect(result.get("pinned")!.x).toBe(9999);
    expect(result.get("pinned")!.y).toBe(9999);
    expect(result.get("auto")!.x).toBeLessThan(9999);
  });

  it("never produces overlapping bounding boxes for 6 nodes in 2 lanes / 3 columns", () => {
    const nodes: TestNode[] = [
      { id: "n1", lane: "customer", column: "input" },
      { id: "n2", lane: "customer", column: "process" },
      { id: "n3", lane: "customer", column: "output" },
      { id: "n4", lane: "support", column: "input" },
      { id: "n5", lane: "support", column: "process" },
      { id: "n6", lane: "support", column: "output" },
    ];
    const result = layoutById(nodes);
    const placed = nodes.map((n) => ({ ...result.get(n.id)!, width: 240, height: 180 }));
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        expect(boxesOverlap(placed[i], placed[j])).toBe(false);
      }
    }
  });
});
