"use server";

import { getSession } from "@/lib/auth/session";
import { defaultHomeForRole } from "@/lib/auth/roles";
import {
  generateDesignerGraph,
  type DesignerMessage,
} from "@/lib/designer/generator";
import { exportDesignerGraph } from "@/lib/designer/exporter";
import type { DesignerGraph } from "@/lib/designer/schema";

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
