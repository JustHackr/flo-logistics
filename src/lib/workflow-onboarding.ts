import {
  readLocalStorage,
  writeLocalStorage,
  removeLocalStorage,
} from "@/lib/safe-storage";

export const WELCOME_TOUR_DONE_KEY = "flo.welcomeTourDone";

export type WorkflowId =
  | "routing"
  | "fleet"
  | "cv-load"
  | "cv-hub"
  | "designer";

export type WorkflowStep = {
  id: string;
  title: string;
  body: string;
  href?: string;
  hrefLabel?: string;
};

export type WorkflowDefinition = {
  id: WorkflowId;
  title: string;
  description: string;
  steps: WorkflowStep[];
};

export type WorkflowProgress = {
  opened: boolean;
  completed: boolean;
  checkedStepIds: string[];
};

const VERSION = "v1";

function storageKey(workflowId: WorkflowId): string {
  return `flo.onboarding.${workflowId}.${VERSION}`;
}

export const WORKFLOWS: Record<WorkflowId, WorkflowDefinition> = {
  routing: {
    id: "routing",
    title: "Routing workflow",
    description:
      "Move orders from intake to delivered stops — create, optimize, monitor, and report.",
    steps: [
      {
        id: "orders",
        title: "Create or import orders",
        body: "Add stops manually or upload the CSV template on Orders.",
        href: "/routing/orders",
        hrefLabel: "Open Orders",
      },
      {
        id: "drivers",
        title: "Verify drivers",
        body: "Each driver needs an assigned vehicle so optimization can match by type and VQI.",
        href: "/routing/drivers",
        hrefLabel: "Open Drivers",
      },
      {
        id: "plan",
        title: "Select orders and plan routes",
        body: "Select orders, then Optimize Selected to preview traffic, fuel, and driver matching.",
        href: "/routing/orders",
        hrefLabel: "Select orders",
      },
      {
        id: "save",
        title: "Save route plans",
        body: "Confirm the preview on Plan Route and save plans before drivers leave.",
        href: "/routing/plan",
        hrefLabel: "Open Plan Route",
      },
      {
        id: "monitor",
        title: "Monitor deliveries",
        body: "Track progress and mark stops delivered on the Logistics dashboard.",
        href: "/routing/dashboard",
        hrefLabel: "Open Logistics",
      },
      {
        id: "reports",
        title: "Export reports",
        body: "Review KPIs and download summary, route, or delivery CSVs.",
        href: "/routing/reports",
        hrefLabel: "Open Reports",
      },
    ],
  },
  fleet: {
    id: "fleet",
    title: "Fleet workflow",
    description:
      "Keep the roster healthy — register vehicles, read VQI risk, and plan maintenance.",
    steps: [
      {
        id: "register",
        title: "Add or import vehicles",
        body: "Create vehicles one by one or import the CSV template.",
        href: "/vehicles",
        hrefLabel: "Open Vehicles",
      },
      {
        id: "vqi",
        title: "Review VQI and risk",
        body: "Scores combine age, odometer, cost, and planning signals. Spot high-risk units early.",
        href: "/vehicles",
        hrefLabel: "View fleet list",
      },
      {
        id: "maintenance",
        title: "Inspect maintenance recommendations",
        body: "Use the Maintenance dashboard for charts, filters, and recommended actions.",
        href: "/dashboard",
        hrefLabel: "Open Maintenance",
      },
      {
        id: "forecast",
        title: "Review and export fleet reports",
        body: "Check the 90-day forecast and export CSV for planning.",
        href: "/reports",
        hrefLabel: "Open Fleet Reports",
      },
    ],
  },
  "cv-load": {
    id: "cv-load",
    title: "Bag load detection",
    description:
      "Count kraft cartons through a bag opening in a timed session. Complements the on-camera how-to.",
    steps: [
      {
        id: "prefs",
        title: "Set session preferences",
        body: "Choose duration, max bag capacity, and capture sensitivity before you start.",
      },
      {
        id: "camera",
        title: "Start the camera",
        body: "Allow access and aim at the bag opening with clear front lighting. The timer starts with the feed.",
      },
      {
        id: "count",
        title: "Pass kraft cartons through",
        body: "Only kraft/tan boxes add to the cumulative count. Humans and other objects are ignored.",
      },
      {
        id: "report",
        title: "End and review the report",
        body: "Wait for the timer or end early, then check the session summary on this page or Home.",
      },
    ],
  },
  "cv-hub": {
    id: "cv-hub",
    title: "Hub congestion workflow",
    description:
      "Track dwell time only inside the yellow platform square after calibration.",
    steps: [
      {
        id: "prefs",
        title: "Set zone and session prefs",
        body: "Adjust duration, overstay threshold, platform size/position, and sensitivity.",
      },
      {
        id: "camera",
        title: "Start the camera",
        body: "Allow access and align the yellow square with your platform mark.",
      },
      {
        id: "calibrate",
        title: "Clear and calibrate",
        body: "Keep the yellow square empty, then wait for auto-calibrate or tap the glowing prompt.",
      },
      {
        id: "monitor",
        title: "Place objects and monitor",
        body: "Track dwell, concurrency, and overstays while the session runs.",
      },
      {
        id: "report",
        title: "End and review visits",
        body: "Finish the session and review visit-level reporting here or on Home.",
      },
    ],
  },
  designer: {
    id: "designer",
    title: "Flo Designer workflow",
    description:
      "Prompt a process graph, overlay it on FLO, save the design, and export JSON.",
    steps: [
      {
        id: "prompt",
        title: "Generate from a prompt",
        body: "Describe a process in plain language and Generate a node graph on the blank canvas.",
        href: "/admin/designer",
        hrefLabel: "Open Flo Designer",
      },
      {
        id: "inspect",
        title: "Inspect a node",
        body: "Click a node to fill the permanent detail pane with connectors and FLO integration context.",
        href: "/admin/designer",
        hrefLabel: "Open Flo Designer",
      },
      {
        id: "refine",
        title: "Refine and spot what’s new",
        body: "Use Apply to refine the graph. Newly added or newly integrated nodes get an amber New accent.",
        href: "/admin/designer",
        hrefLabel: "Open Flo Designer",
      },
      {
        id: "save",
        title: "Save the design",
        body: "Name the canvas and Save or Save as. Designs persist in SQLite for this deployment.",
        href: "/admin/designer",
        hrefLabel: "Open Flo Designer",
      },
      {
        id: "export",
        title: "Export JSON",
        body: "Export the schema as pretty-printed JSON and use copy or download from the export canvas.",
        href: "/admin/designer",
        hrefLabel: "Open Flo Designer",
      },
    ],
  },
};

const EMPTY_PROGRESS: WorkflowProgress = {
  opened: false,
  completed: false,
  checkedStepIds: [],
};

export function isWelcomeTourDone(): boolean {
  return readLocalStorage(WELCOME_TOUR_DONE_KEY) === "1";
}

export function readWorkflowProgress(
  workflowId: WorkflowId
): WorkflowProgress {
  const raw = readLocalStorage(storageKey(workflowId));
  if (!raw) return { ...EMPTY_PROGRESS, checkedStepIds: [] };
  try {
    const parsed = JSON.parse(raw) as Partial<WorkflowProgress>;
    const validIds = new Set(
      WORKFLOWS[workflowId].steps.map((step) => step.id)
    );
    const checkedStepIds = Array.isArray(parsed.checkedStepIds)
      ? parsed.checkedStepIds.filter(
          (id): id is string => typeof id === "string" && validIds.has(id)
        )
      : [];
    return {
      opened: Boolean(parsed.opened),
      completed: Boolean(parsed.completed),
      checkedStepIds,
    };
  } catch {
    return { ...EMPTY_PROGRESS, checkedStepIds: [] };
  }
}

export function writeWorkflowProgress(
  workflowId: WorkflowId,
  progress: WorkflowProgress
): boolean {
  return writeLocalStorage(storageKey(workflowId), JSON.stringify(progress));
}

export function resetWorkflowProgress(workflowId: WorkflowId): void {
  removeLocalStorage(storageKey(workflowId));
}

export function toggleCheckedStep(
  progress: WorkflowProgress,
  stepId: string
): WorkflowProgress {
  const has = progress.checkedStepIds.includes(stepId);
  const checkedStepIds = has
    ? progress.checkedStepIds.filter((id) => id !== stepId)
    : [...progress.checkedStepIds, stepId];
  return { ...progress, checkedStepIds };
}

export function markWorkflowOpened(
  progress: WorkflowProgress
): WorkflowProgress {
  return { ...progress, opened: true };
}

export function markWorkflowCompleted(
  progress: WorkflowProgress
): WorkflowProgress {
  return { ...progress, completed: true, opened: true };
}

/**
 * Resolve which core workflow applies to a pathname, if any.
 */
export function workflowIdForPath(pathname: string): WorkflowId | null {
  if (
    pathname === "/computer-vision/load-detection" ||
    pathname.startsWith("/computer-vision/load-detection/")
  ) {
    return "cv-load";
  }
  if (
    pathname === "/computer-vision/hub-congestion-detection" ||
    pathname.startsWith("/computer-vision/hub-congestion-detection/")
  ) {
    return "cv-hub";
  }
  if (
    pathname === "/admin/designer" ||
    pathname.startsWith("/admin/designer/")
  ) {
    return "designer";
  }
  if (pathname === "/routing" || pathname.startsWith("/routing/")) {
    return "routing";
  }
  if (
    pathname === "/vehicles" ||
    pathname.startsWith("/vehicles/") ||
    pathname === "/dashboard" ||
    pathname.startsWith("/dashboard/") ||
    pathname === "/reports" ||
    pathname.startsWith("/reports/") ||
    pathname === "/methodology" ||
    pathname.startsWith("/methodology/")
  ) {
    return "fleet";
  }
  return null;
}

export function shouldAutoOpenWorkflow(progress: WorkflowProgress): boolean {
  return !progress.opened && !progress.completed;
}
