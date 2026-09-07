import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  PROCESS_EDGES,
  PROCESS_NODES,
  type NodeKind,
} from "./graph";

describe("process map graph", () => {
  it("uses unique node ids", () => {
    const ids = PROCESS_NODES.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares every edge node", () => {
    const ids = new Set(PROCESS_NODES.map((n) => n.id));
    for (const edge of PROCESS_EDGES) {
      expect(ids.has(edge.source), `edge ${edge.id}: missing source`).toBe(true);
      expect(ids.has(edge.target), `edge ${edge.id}: missing target`).toBe(true);
    }
  });

  it("keeps kinds balanced (at least one of each)", () => {
    const kinds = new Set<NodeKind>(PROCESS_NODES.map((n) => n.kind));
    expect(kinds.has("input")).toBe(true);
    expect(kinds.has("process")).toBe(true);
    expect(kinds.has("output")).toBe(true);
  });

  it("every source file actually exists on disk", () => {
    const projectRoot = resolve(__dirname, "../../..");
    const missing: string[] = [];
    for (const node of PROCESS_NODES) {
      for (const relative of node.detail.sourceFiles) {
        const abs = resolve(projectRoot, relative);
        if (!existsSync(abs)) {
          missing.push(`${node.id} → ${relative}`);
        }
      }
    }
    expect(missing, `missing source files:\n${missing.join("\n")}`).toEqual([]);
  });

  it("every node has at least one detail bullet per section", () => {
    for (const node of PROCESS_NODES) {
      expect(node.detail.inputs.length, node.id).toBeGreaterThan(0);
      expect(node.detail.process.length, node.id).toBeGreaterThan(0);
      expect(node.detail.outputs.length, node.id).toBeGreaterThan(0);
      expect(node.detail.sourceFiles.length, node.id).toBeGreaterThan(0);
    }
  });

  it("uses unique edge ids", () => {
    const ids = PROCESS_EDGES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
