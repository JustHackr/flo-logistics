import { describe, expect, it } from "vitest";
import { integrateWithFlo } from "@/lib/designer/integrate";
import type { DesignerGraph } from "@/lib/designer/schema";

function buildGraph(nodes: DesignerGraph["nodes"], edges: DesignerGraph["edges"]): DesignerGraph {
  return { nodes, edges };
}

describe("integrateWithFlo", () => {
  it("maps support/vehicle nodes to FLO ids", () => {
    const graph = buildGraph(
      [
        {
          id: "support",
          label: "Support agent",
          kind: "process",
          summary: "Handles user requests",
          bullets: [],
          lane: "support",
        },
        {
          id: "fleet",
          label: "Vehicle dispatcher",
          kind: "process",
          summary: "Allocates trucks",
          bullets: [],
          lane: "operations",
        },
      ],
      [],
    );

    const result = integrateWithFlo(graph);
    expect(result.integrated).toBe(true);
    expect(result.mapped.sort()).toEqual(["fleet", "support"]);
    const integrationEdges = result.graph.edges.filter(
      (e) => e.label === "integrated with",
    );
    expect(integrationEdges).toHaveLength(2);
    expect(integrationEdges.map((e) => e.target).sort()).toEqual([
      "input-vehicles",
      "proc-ai",
    ]);
  });

  it("does not duplicate edges when the LLM already drew them", () => {
    const graph = buildGraph(
      [
        {
          id: "agent",
          label: "Chatbot agent",
          kind: "process",
          summary: "",
          bullets: [],
          lane: "support",
        },
      ],
      [{ source: "agent", target: "proc-ai", label: "manual" }],
    );

    const result = integrateWithFlo(graph);
    expect(result.graph.edges).toHaveLength(1);
    expect(result.graph.edges[0].label).toBe("manual");
  });

  it("returns integrated=false when nothing matches", () => {
    const graph = buildGraph(
      [
        {
          id: "unicorn",
          label: "Unicorn wrangler",
          kind: "process",
          summary: "Magical",
          bullets: [],
          lane: "mythical",
        },
      ],
      [],
    );
    const result = integrateWithFlo(graph);
    expect(result.integrated).toBe(false);
    expect(result.mapped).toEqual([]);
    expect(result.graph.edges).toHaveLength(0);
  });
});
