import { describe, expect, it } from "vitest";
import {
  getFloNodeContext,
  integrateWithFlo,
  summarizeIntegration,
} from "@/lib/designer/integrate";
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

describe("getFloNodeContext", () => {
  it("returns context for a known FLO id", () => {
    const ctx = getFloNodeContext("input-vehicles");
    expect(ctx?.id).toBe("input-vehicles");
    expect(ctx?.kind).toBe("input");
    expect(ctx?.inputs.length).toBeGreaterThan(0);
    expect(ctx?.sourceFiles.length).toBeGreaterThan(0);
  });

  it("returns null for an unknown FLO id", () => {
    expect(getFloNodeContext("does-not-exist")).toBeNull();
  });
});

describe("summarizeIntegration", () => {
  const nodes = [
    { id: "a", label: "Customer", _floId: null },
    { id: "b", label: "Agent", _floId: "proc-ai" },
    { id: "c", label: "Vehicle", _floId: "input-vehicles" },
  ];
  const edges = [
    { source: "a", target: "b", label: "asks" },
    { source: "b", target: "c", label: "dispatches" },
    { source: "b", target: "proc-ai", label: "integrated with" },
  ];

  it("splits edges into incoming and outgoing for the selected node", () => {
    const summary = summarizeIntegration({
      selectedId: "b",
      nodes,
      edges,
      floId: "proc-ai",
    });
    expect(summary.incoming).toEqual([
      { otherId: "a", otherLabel: "Customer", direction: "incoming", label: "asks" },
    ]);
    expect(summary.outgoing).toHaveLength(2);
    expect(summary.outgoing.map((e) => e.otherId).sort()).toEqual([
      "c",
      "proc-ai",
    ]);
  });

  it("resolves the integration target via getFloNodeContext", () => {
    const summary = summarizeIntegration({
      selectedId: "b",
      nodes,
      edges,
      floId: "proc-ai",
    });
    expect(summary.floTarget?.id).toBe("proc-ai");
    expect(summary.floTarget?.kind).toBe("process");
  });

  it("returns empty arrays when the node has no connectors", () => {
    const summary = summarizeIntegration({
      selectedId: "c",
      nodes: [
        { id: "x", label: "Lone" },
        { id: "y", label: "Other" },
      ],
      edges: [{ source: "x", target: "y", label: "calls" }],
      floId: null,
    });
    expect(summary.incoming).toEqual([]);
    expect(summary.outgoing).toEqual([]);
    expect(summary.floTarget).toBeNull();
  });
});
