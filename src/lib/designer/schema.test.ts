import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  parseDesignerGraph,
  type DesignerGraph,
} from "@/lib/designer/schema";

describe("parseDesignerGraph", () => {
  it("accepts a well-formed graph", () => {
    const ok: DesignerGraph = {
      nodes: [
        {
          id: "n1",
          label: "Capture order",
          kind: "input",
          summary: "Receive order from storefront",
          bullets: ["Validate address", "Persist"],
          lane: "customer",
        },
        {
          id: "n2",
          label: "Process order",
          kind: "process",
          summary: "Fulfil",
          bullets: [],
          lane: "operations",
        },
        {
          id: "n3",
          label: "Deliver",
          kind: "output",
          summary: "Driver delivers",
          bullets: [],
          lane: "operations",
        },
      ],
      edges: [{ source: "n1", target: "n2" }, { source: "n2", target: "n3" }],
    };

    const result = parseDesignerGraph(ok);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.graph.nodes).toHaveLength(3);
      expect(result.graph.edges).toHaveLength(2);
    }
  });

  it("rejects duplicate node ids", () => {
    const result = parseDesignerGraph({
      nodes: [
        { id: "x", label: "A", kind: "input", summary: "", bullets: [], lane: "" },
        { id: "x", label: "B", kind: "process", summary: "", bullets: [], lane: "" },
      ],
      edges: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("duplicate-id");
  });

  it("rejects edges to unknown nodes", () => {
    const result = parseDesignerGraph({
      nodes: [
        { id: "n1", label: "A", kind: "input", summary: "", bullets: [], lane: "" },
      ],
      edges: [{ source: "n1", target: "ghost" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("edge-target-missing");
  });

  it("rejects self-loops", () => {
    const result = parseDesignerGraph({
      nodes: [
        { id: "n1", label: "A", kind: "process", summary: "", bullets: [], lane: "" },
      ],
      edges: [{ source: "n1", target: "n1" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("self-loop");
  });

  it("rejects unknown node kinds", () => {
    const result = parseDesignerGraph({
      nodes: [
        { id: "n1", label: "A", kind: "magic", summary: "", bullets: [], lane: "" },
      ],
      edges: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unknown-kind");
  });

  it("rejects empty graphs", () => {
    const result = parseDesignerGraph({ nodes: [], edges: [] });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("rejects non-object root", () => {
    expect(parseDesignerGraph("nope").ok).toBe(false);
    expect(parseDesignerGraph(null).ok).toBe(false);
  });
});

describe("extractJsonObject", () => {
  it("parses a plain JSON object", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips ```json fences", () => {
    expect(extractJsonObject("```json\n{\"a\":2}\n```")).toEqual({ a: 2 });
  });

  it("falls back to the first balanced object when prose surrounds it", () => {
    const text =
      "Sure thing, here you go:\n\n{\"nodes\":[],\"edges\":[]}\n\nLet me know.";
    expect(extractJsonObject(text)).toEqual({ nodes: [], edges: [] });
  });

  it("returns null for non-JSON", () => {
    expect(extractJsonObject("not json at all")).toBeNull();
  });

  it("parses JSON with raw newlines inside strings", () => {
    const text = `{"nodes":[{"id":"n1","label":"A","kind":"input","summary":"line1
line2","bullets":[],"lane":"ops"}],"edges":[]}`;
    expect(extractJsonObject(text)).toEqual({
      nodes: [
        {
          id: "n1",
          label: "A",
          kind: "input",
          summary: "line1\nline2",
          bullets: [],
          lane: "ops",
        },
      ],
      edges: [],
    });
  });

  it("parses JSON with trailing commas", () => {
    expect(extractJsonObject('{"nodes":[{"id":"n1",}],"edges":[],}')).toEqual({
      nodes: [{ id: "n1" }],
      edges: [],
    });
  });

  it("closes a truncated object enough to parse", () => {
    const text = '{"nodes":[{"id":"n1","label":"A"},{"id":"n2"';
    const parsed = extractJsonObject(text) as { nodes: Array<{ id: string }> };
    expect(parsed.nodes[0].id).toBe("n1");
  });
});
