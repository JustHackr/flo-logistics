import { describe, expect, it } from "vitest";
import {
  parseStoredDesignerGraph,
  parseStoredDesignerGraphJson,
  serializeStoredDesignerGraph,
} from "@/lib/designer/designs";
import type { DesignerGraph } from "@/lib/designer/schema";

const baseGraph: DesignerGraph = {
  nodes: [
    {
      id: "a",
      label: "Intake",
      kind: "input",
      summary: "Receive tickets",
      bullets: ["triage"],
      lane: "core",
    },
    {
      id: "b",
      label: "Agent",
      kind: "process",
      summary: "Respond",
      bullets: [],
      lane: "core",
    },
  ],
  edges: [{ source: "a", target: "b" }],
};

describe("serializeStoredDesignerGraph", () => {
  it("preserves _floId annotations", () => {
    const withFlo = {
      nodes: [
        { ...baseGraph.nodes[0], _floId: null },
        { ...baseGraph.nodes[1], _floId: "proc-ai" },
      ],
      edges: [
        ...baseGraph.edges,
        { source: "b", target: "proc-ai", label: "integrated with" },
      ],
    } as DesignerGraph;
    const raw = JSON.parse(serializeStoredDesignerGraph(withFlo));
    expect(raw.nodes[1]._floId).toBe("proc-ai");
    expect(raw.edges).toHaveLength(2);
  });
});

describe("parseStoredDesignerGraph", () => {
  it("round-trips a plain graph", () => {
    const json = serializeStoredDesignerGraph(baseGraph);
    const result = parseStoredDesignerGraphJson(json);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graph.nodes).toHaveLength(2);
    expect(result.graph.edges).toEqual([{ source: "a", target: "b" }]);
  });

  it("keeps FLO integration edges and _floId", () => {
    const result = parseStoredDesignerGraph({
      nodes: [
        {
          id: "b",
          label: "Agent",
          kind: "process",
          summary: "Respond",
          bullets: [],
          lane: "core",
          _floId: "proc-ai",
        },
      ],
      edges: [{ source: "b", target: "proc-ai", label: "integrated with" }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graph.nodes[0]._floId).toBe("proc-ai");
    expect(result.graph.edges[0]).toEqual({
      source: "b",
      target: "proc-ai",
      label: "integrated with",
    });
  });

  it("rejects empty graphs", () => {
    expect(parseStoredDesignerGraph({ nodes: [], edges: [] }).ok).toBe(false);
  });

  it("rejects edges whose source is unknown", () => {
    const result = parseStoredDesignerGraph({
      nodes: [
        {
          id: "a",
          label: "A",
          kind: "input",
          summary: "",
          bullets: [],
          lane: "core",
        },
      ],
      edges: [{ source: "missing", target: "a" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("edge-source-missing");
  });
});
