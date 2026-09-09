import { afterEach, describe, expect, it, vi } from "vitest";
import {
  WORKFLOWS,
  isWelcomeTourDone,
  markWorkflowCompleted,
  markWorkflowOpened,
  readWorkflowProgress,
  resetWorkflowProgress,
  shouldAutoOpenWorkflow,
  toggleCheckedStep,
  workflowIdForPath,
  writeWorkflowProgress,
  WELCOME_TOUR_DONE_KEY,
  type WorkflowProgress,
} from "@/lib/workflow-onboarding";

const store = new Map<string, string>();

afterEach(() => {
  store.clear();
  vi.unstubAllGlobals();
});

function stubStorage() {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    },
  });
}

describe("workflowIdForPath", () => {
  it("maps routing subtree", () => {
    expect(workflowIdForPath("/routing/orders")).toBe("routing");
    expect(workflowIdForPath("/routing/plan")).toBe("routing");
    expect(workflowIdForPath("/routing/dashboard")).toBe("routing");
  });

  it("maps fleet routes without colliding with routing reports", () => {
    expect(workflowIdForPath("/vehicles")).toBe("fleet");
    expect(workflowIdForPath("/vehicles/new")).toBe("fleet");
    expect(workflowIdForPath("/dashboard")).toBe("fleet");
    expect(workflowIdForPath("/reports")).toBe("fleet");
    expect(workflowIdForPath("/methodology")).toBe("fleet");
    expect(workflowIdForPath("/routing/reports")).toBe("routing");
  });

  it("maps CV load and hub only", () => {
    expect(workflowIdForPath("/computer-vision/load-detection")).toBe("cv-load");
    expect(workflowIdForPath("/computer-vision/hub-congestion-detection")).toBe(
      "cv-hub"
    );
    expect(workflowIdForPath("/computer-vision/odol-detection")).toBeNull();
  });

  it("returns null for home and system", () => {
    expect(workflowIdForPath("/")).toBeNull();
    expect(workflowIdForPath("/ai/chat")).toBeNull();
    expect(workflowIdForPath("/system/gas-price")).toBeNull();
  });

  it("maps Flo Designer and leaves process-map unmapped", () => {
    expect(workflowIdForPath("/admin/designer")).toBe("designer");
    expect(workflowIdForPath("/admin/designer/")).toBe("designer");
    expect(workflowIdForPath("/admin/process-map")).toBeNull();
  });
});

describe("workflow progress persistence", () => {
  it("reads empty progress by default", () => {
    stubStorage();
    expect(readWorkflowProgress("routing")).toEqual({
      opened: false,
      completed: false,
      checkedStepIds: [],
    });
  });

  it("round-trips progress and filters unknown step ids", () => {
    stubStorage();
    const progress: WorkflowProgress = {
      opened: true,
      completed: false,
      checkedStepIds: ["orders", "not-a-real-step"],
    };
    writeWorkflowProgress("routing", progress);
    expect(readWorkflowProgress("routing")).toEqual({
      opened: true,
      completed: false,
      checkedStepIds: ["orders"],
    });
  });

  it("resets progress", () => {
    stubStorage();
    writeWorkflowProgress("fleet", {
      opened: true,
      completed: true,
      checkedStepIds: ["register"],
    });
    resetWorkflowProgress("fleet");
    expect(readWorkflowProgress("fleet").opened).toBe(false);
  });

  it("toggles checked steps and completion helpers", () => {
    const base: WorkflowProgress = {
      opened: false,
      completed: false,
      checkedStepIds: [],
    };
    const withStep = toggleCheckedStep(base, "orders");
    expect(withStep.checkedStepIds).toEqual(["orders"]);
    expect(toggleCheckedStep(withStep, "orders").checkedStepIds).toEqual([]);
    expect(markWorkflowOpened(base).opened).toBe(true);
    expect(markWorkflowCompleted(base)).toEqual({
      opened: true,
      completed: true,
      checkedStepIds: [],
    });
  });

  it("gates auto-open on prior open or completion", () => {
    const fresh: WorkflowProgress = {
      opened: false,
      completed: false,
      checkedStepIds: [],
    };
    expect(shouldAutoOpenWorkflow(fresh)).toBe(true);
    expect(shouldAutoOpenWorkflow({ ...fresh, opened: true })).toBe(false);
    expect(shouldAutoOpenWorkflow({ ...fresh, completed: true })).toBe(false);
  });

  it("reads welcome tour flag", () => {
    stubStorage();
    expect(isWelcomeTourDone()).toBe(false);
    store.set(WELCOME_TOUR_DONE_KEY, "1");
    expect(isWelcomeTourDone()).toBe(true);
  });

  it("defines non-empty steps for every core workflow", () => {
    for (const workflow of Object.values(WORKFLOWS)) {
      expect(workflow.steps.length).toBeGreaterThan(0);
      expect(new Set(workflow.steps.map((s) => s.id)).size).toBe(
        workflow.steps.length
      );
    }
  });
});
