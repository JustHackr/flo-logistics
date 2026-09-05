"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { WorkflowChecklist } from "@/components/onboarding/workflow-checklist";
import {
  WORKFLOWS,
  readWorkflowProgress,
  shouldAutoOpenWorkflow,
  workflowIdForPath,
  type WorkflowId,
  type WorkflowProgress,
  writeWorkflowProgress,
  markWorkflowOpened,
} from "@/lib/workflow-onboarding";

/**
 * Hosts the core-workflow checklist for Routing, Fleet, Load Detection, and
 * Hub Congestion. Mount once in AppShell; resolves the active workflow from
 * the current pathname. Auto-opens a centered Dialog once per workflow.
 */
export function CoreWorkflowOnboarding() {
  const pathname = usePathname();
  const workflowId = React.useMemo(
    () => workflowIdForPath(pathname),
    [pathname]
  );

  const [progressById, setProgressById] = React.useState<
    Partial<Record<WorkflowId, WorkflowProgress>>
  >({});
  const [open, setOpen] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (!hydrated || !workflowId) {
      setOpen(false);
      return;
    }

    const stored = readWorkflowProgress(workflowId);
    setProgressById((prev) => ({ ...prev, [workflowId]: stored }));

    if (shouldAutoOpenWorkflow(stored)) {
      const opened = markWorkflowOpened(stored);
      writeWorkflowProgress(workflowId, opened);
      setProgressById((prev) => ({ ...prev, [workflowId]: opened }));
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [hydrated, workflowId]);

  if (!workflowId) return null;

  const workflow = WORKFLOWS[workflowId];
  const progress =
    progressById[workflowId] ??
    ({
      opened: false,
      completed: false,
      checkedStepIds: [],
    } satisfies WorkflowProgress);

  return (
    <WorkflowChecklist
      workflow={workflow}
      progress={progress}
      open={open}
      onOpenChange={setOpen}
      onProgressChange={(next) =>
        setProgressById((prev) => ({ ...prev, [workflowId]: next }))
      }
      showTrigger
    />
  );
}
