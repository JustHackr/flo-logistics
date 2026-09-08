"use server";

import { getSession } from "@/lib/auth/session";
import { defaultHomeForRole } from "@/lib/auth/roles";
import {
  generateDesignerGraph,
  type DesignerMessage,
} from "@/lib/designer/generator";
import { exportDesignerGraph } from "@/lib/designer/exporter";
import type { DesignerGraph } from "@/lib/designer/schema";
import {
  parseStoredDesignerGraphJson,
  serializeStoredDesignerGraph,
  type StoredDesignerGraph,
} from "@/lib/designer/designs";
import { prisma } from "@/lib/prisma";

export type DesignerActionOk = {
  ok: true;
  graph: import("@/lib/designer/schema").DesignerGraph;
  integrated: boolean;
};

export type DesignerActionError = {
  ok: false;
  code: "unauthorized" | "no-key" | "empty" | "parse" | "shape" | "timeout" | "provider";
  message: string;
};

export type DesignerActionResult = DesignerActionOk | DesignerActionError;

export async function generateSchemaAction(input: {
  prompt: string;
  history?: DesignerMessage[];
  locale?: "en" | "id";
}): Promise<DesignerActionResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return {
      ok: false,
      code: "unauthorized",
      message: "Admin role required.",
    };
  }

  const result = await generateDesignerGraph({
    prompt: input.prompt,
    history: input.history,
    locale: input.locale ?? "en",
  });

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  // Designer graphs are ephemeral client state; no cache revalidation needed
  // (revalidating here made the router re-prefetch every sidebar route).
  return {
    ok: true,
    graph: result.graph,
    integrated: result.integrated,
  };
}

export type DesignerExportOk = {
  ok: true;
  target: string;
  content: string;
  summary: string;
};

export type DesignerExportError = {
  ok: false;
  code: "unauthorized" | "no-key" | "empty" | "parse" | "timeout" | "provider";
  message: string;
};

export type DesignerExportResult = DesignerExportOk | DesignerExportError;

export async function exportDesignerAction(input: {
  graph: DesignerGraph;
  target: string;
  locale?: "en" | "id";
}): Promise<DesignerExportResult> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return {
      ok: false,
      code: "unauthorized",
      message: "Admin role required.",
    };
  }

  const result = await exportDesignerGraph({
    graph: input.graph,
    target: input.target,
    locale: input.locale ?? "en",
  });

  if (!result.ok) {
    return { ok: false, code: result.code, message: result.message };
  }

  return {
    ok: true,
    target: result.target,
    content: result.content,
    summary: result.summary,
  };
}

export async function designerRedirectToHome(): Promise<void> {
  const session = await getSession();
  return Promise.resolve(
    defaultHomeForRole(session?.role ?? "ADMIN") as never,
  );
}

// ---------------------------------------------------------------------------
// Saved designs CRUD (SQLite)
// ---------------------------------------------------------------------------

export type DesignerDesignSummary = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
};

export type DesignerDesignDetail = DesignerDesignSummary & {
  graph: StoredDesignerGraph;
};

type DesignAuthError = {
  ok: false;
  code: "unauthorized" | "empty" | "shape" | "not-found" | "network";
  message: string;
};

async function requireDesignerAdmin(): Promise<
  { ok: true } | DesignAuthError
> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return {
      ok: false,
      code: "unauthorized",
      message: "Admin role required.",
    };
  }
  return { ok: true };
}

function toSummary(row: {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}): DesignerDesignSummary {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listDesignerDesignsAction(): Promise<
  { ok: true; designs: DesignerDesignSummary[] } | DesignAuthError
> {
  const auth = await requireDesignerAdmin();
  if (!auth.ok) return auth;
  const rows = await prisma.designerDesign.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, createdAt: true, updatedAt: true },
  });
  return { ok: true, designs: rows.map(toSummary) };
}

export async function getDesignerDesignAction(input: {
  id: string;
}): Promise<{ ok: true; design: DesignerDesignDetail } | DesignAuthError> {
  const auth = await requireDesignerAdmin();
  if (!auth.ok) return auth;
  const id = input.id.trim();
  if (!id) {
    return { ok: false, code: "empty", message: "Missing design id." };
  }
  const row = await prisma.designerDesign.findUnique({ where: { id } });
  if (!row) {
    return { ok: false, code: "not-found", message: "Design not found." };
  }
  const parsed = parseStoredDesignerGraphJson(row.graphJson);
  if (!parsed.ok) {
    return {
      ok: false,
      code: "shape",
      message: "Saved design graph is invalid.",
    };
  }
  return {
    ok: true,
    design: { ...toSummary(row), graph: parsed.graph },
  };
}

export async function createDesignerDesignAction(input: {
  name: string;
  graph: DesignerGraph;
}): Promise<{ ok: true; design: DesignerDesignSummary } | DesignAuthError> {
  const auth = await requireDesignerAdmin();
  if (!auth.ok) return auth;
  const name = input.name.trim().slice(0, 120);
  if (!name) {
    return { ok: false, code: "empty", message: "Name is required." };
  }
  if (!input.graph?.nodes?.length) {
    return { ok: false, code: "empty", message: "Canvas is empty." };
  }
  const graphJson = serializeStoredDesignerGraph(input.graph);
  const parsed = parseStoredDesignerGraphJson(graphJson);
  if (!parsed.ok) {
    return { ok: false, code: "shape", message: "Graph could not be saved." };
  }
  const row = await prisma.designerDesign.create({
    data: { name, graphJson },
  });
  return { ok: true, design: toSummary(row) };
}

export async function updateDesignerDesignAction(input: {
  id: string;
  name?: string;
  graph: DesignerGraph;
}): Promise<{ ok: true; design: DesignerDesignSummary } | DesignAuthError> {
  const auth = await requireDesignerAdmin();
  if (!auth.ok) return auth;
  const id = input.id.trim();
  if (!id) {
    return { ok: false, code: "empty", message: "Missing design id." };
  }
  if (!input.graph?.nodes?.length) {
    return { ok: false, code: "empty", message: "Canvas is empty." };
  }
  const existing = await prisma.designerDesign.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, code: "not-found", message: "Design not found." };
  }
  const name =
    typeof input.name === "string" && input.name.trim().length > 0
      ? input.name.trim().slice(0, 120)
      : existing.name;
  const graphJson = serializeStoredDesignerGraph(input.graph);
  const parsed = parseStoredDesignerGraphJson(graphJson);
  if (!parsed.ok) {
    return { ok: false, code: "shape", message: "Graph could not be saved." };
  }
  const row = await prisma.designerDesign.update({
    where: { id },
    data: { name, graphJson },
  });
  return { ok: true, design: toSummary(row) };
}

export async function deleteDesignerDesignAction(input: {
  id: string;
}): Promise<{ ok: true } | DesignAuthError> {
  const auth = await requireDesignerAdmin();
  if (!auth.ok) return auth;
  const id = input.id.trim();
  if (!id) {
    return { ok: false, code: "empty", message: "Missing design id." };
  }
  try {
    await prisma.designerDesign.delete({ where: { id } });
  } catch {
    return { ok: false, code: "not-found", message: "Design not found." };
  }
  return { ok: true };
}
