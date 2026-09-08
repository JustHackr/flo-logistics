import { describe, expect, it } from "vitest";
import type { DesignerGraph } from "@/lib/designer/schema";
import {
  buildDeterministicSummary,
  exportExtension,
  exportSlug,
  parseExportEnvelope,
  serializeGraphForExport,
} from "@/lib/designer/export-format";

const graph: DesignerGraph = {
  nodes: [
    {
      id: "b",
      label: "Billing",
      kind: "process",
      summary: "Issues invoices",
      bullets: ["Calculate total"],
      lane: "billing",
    },
    {
      id: "a",
      label: "Customer",
      kind: "input",
      summary: "Receives orders",
      bullets: [],
      lane: "customer",
    },
  ],
  edges: [
    { source: "b", target: "a", label: "sends invoice" },
    { source: "a", target: "b", label: "places order" },
  ],
};

describe("serializeGraphForExport", () => {
  it("sorts nodes by id", () => {
    const out = JSON.parse(serializeGraphForExport(graph));
    expect(out.nodes.map((n: { id: string }) => n.id)).toEqual(["a", "b"]);
  });

  it("sorts edges by source then target", () => {
    const out = JSON.parse(serializeGraphForExport(graph));
    expect(out.edges).toEqual([
      { source: "a", target: "b", label: "places order" },
      { source: "b", target: "a", label: "sends invoice" },
    ]);
  });

  it("produces identical output for the same graph regardless of insertion order", () => {
    const reordered: DesignerGraph = {
      nodes: [...graph.nodes].reverse(),
      edges: [...graph.edges].reverse(),
    };
    expect(serializeGraphForExport(reordered)).toBe(serializeGraphForExport(graph));
  });
});

describe("exportSlug", () => {
  it("lowercases and replaces spaces with dashes", () => {
    expect(exportSlug("Postgres DDL")).toBe("postgres-ddl");
  });

  it("drops diacritics and punctuation", () => {
    expect(exportSlug("OpenAPI 3.1 — YAML!")).toBe("openapi-3-1-yaml");
  });

  it("caps length and falls back when empty", () => {
    expect(exportSlug("a".repeat(80))).toHaveLength(48);
    expect(exportSlug("$$$")).toBe("export");
  });
});

describe("exportExtension", () => {
  it.each([
    ["Postgres DDL", "sql"],
    ["as Mermaid", "md"],
    ["OpenAPI 3.1 YAML", "yaml"],
    ["JSON Schema", "json"],
    ["edges as CSV", "csv"],
    ["Markdown table", "md"],
    ["Draw.io XML", "xml"],
    ["plain text", "txt"],
  ])("maps %s -> %s", (target, ext) => {
    expect(exportExtension(target)).toBe(ext);
  });
});

describe("parseExportEnvelope", () => {
  it("returns summary and artifact on a valid envelope", () => {
    const result = parseExportEnvelope({
      summary: "Exported 2 nodes as Postgres DDL.",
      artifact: "CREATE TABLE foo (id INT);",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.summary).toMatch(/Postgres/);
      expect(result.envelope.artifact).toMatch(/CREATE TABLE/);
    }
  });

  it("rejects an empty artifact", () => {
    const result = parseExportEnvelope({
      summary: "ok",
      artifact: "  ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("empty");
  });

  it("rejects a non-object root", () => {
    expect(parseExportEnvelope("nope").ok).toBe(false);
  });

  it("caps the summary length", () => {
    const long = "x".repeat(2000);
    const result = parseExportEnvelope({ summary: long, artifact: "a" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.envelope.summary.length).toBeLessThanOrEqual(600);
  });
});

describe("buildDeterministicSummary", () => {
  it("mentions node + edge counts and the target", () => {
    const summary = buildDeterministicSummary({
      target: "Mermaid",
      graph,
    });
    expect(summary).toMatch(/2-node/);
    expect(summary).toMatch(/2-edge/);
    expect(summary).toMatch(/Mermaid/);
  });

  it("lists the per-kind counts", () => {
    const summary = buildDeterministicSummary({ target: "JSON", graph });
    expect(summary).toMatch(/1 process/);
    expect(summary).toMatch(/1 input/);
  });
});
