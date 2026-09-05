"use client";

import * as React from "react";
import Link from "next/link";
import { Check, ListChecks, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n/use-i18n";
import { cn } from "@/lib/utils";
import {
  type WorkflowDefinition,
  type WorkflowId,
  type WorkflowProgress,
  markWorkflowCompleted,
  markWorkflowOpened,
  resetWorkflowProgress,
  toggleCheckedStep,
  writeWorkflowProgress,
} from "@/lib/workflow-onboarding";

type WorkflowChecklistProps = {
  workflow: WorkflowDefinition;
  progress: WorkflowProgress;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressChange: (next: WorkflowProgress) => void;
  /** Compact text button shown in the top bar. */
  showTrigger?: boolean;
};

function workflowMessageKey(id: WorkflowId): string {
  switch (id) {
    case "cv-load":
      return "cvLoad";
    case "cv-hub":
      return "cvHub";
    default:
      return id;
  }
}

export function WorkflowChecklist({
  workflow,
  progress,
  open,
  onOpenChange,
  onProgressChange,
  showTrigger = true,
}: WorkflowChecklistProps) {
  const { t } = useI18n();
  const messageKey = workflowMessageKey(workflow.id);
  const baseKey = `onboarding.workflows.${messageKey}`;

  const checkedCount = progress.checkedStepIds.length;
  const total = workflow.steps.length;
  const allChecked = checkedCount === total && total > 0;

  const persist = React.useCallback(
    (next: WorkflowProgress) => {
      writeWorkflowProgress(workflow.id, next);
      onProgressChange(next);
    },
    [onProgressChange, workflow.id]
  );

  const handleOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (nextOpen && !progress.opened) {
        persist(markWorkflowOpened(progress));
      }
      onOpenChange(nextOpen);
    },
    [onOpenChange, persist, progress]
  );

  const handleSkipOrDone = React.useCallback(() => {
    persist(markWorkflowCompleted(progress));
    onOpenChange(false);
  }, [onOpenChange, persist, progress]);

  const handleToggle = React.useCallback(
    (stepId: string) => {
      persist(toggleCheckedStep(progress, stepId));
    },
    [persist, progress]
  );

  const handleReset = React.useCallback(() => {
    resetWorkflowProgress(workflow.id);
    const fresh: WorkflowProgress = {
      opened: true,
      completed: false,
      checkedStepIds: [],
    };
    writeWorkflowProgress(workflow.id, fresh);
    onProgressChange(fresh);
  }, [onProgressChange, workflow.id]);

  return (
    <>
      {showTrigger && (
        <button
          type="button"
          onClick={() => {
            if (!progress.opened) {
              persist(markWorkflowOpened(progress));
            }
            onOpenChange(true);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
        >
          <ListChecks className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">{t("chrome.workflowGuide")}</span>
          <span className="sm:hidden">{t("chrome.guide")}</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <DialogHeader className="gap-1.5 border-b border-border/80 p-4 pr-12 text-left">
            <DialogTitle>{t(`${baseKey}.title`)}</DialogTitle>
            <DialogDescription className="text-balance leading-relaxed">
              {t(`${baseKey}.description`)}
            </DialogDescription>
            <p className="pt-1 text-xs font-medium text-primary">
              {t("onboarding.workflows.common.progress", {
                completed: checkedCount,
                total,
              })}
            </p>
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={checkedCount}
              aria-valuemin={0}
              aria-valuemax={total}
              aria-label={t("onboarding.workflows.common.progressLabel")}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{
                  width: `${total === 0 ? 0 : (checkedCount / total) * 100}%`,
                }}
              />
            </div>
          </DialogHeader>

          <ol className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            {workflow.steps.map((step, index) => {
              const checked = progress.checkedStepIds.includes(step.id);
              const stepTitle = t(`${baseKey}.steps.${step.id}.title`);
              const stepBody = t(`${baseKey}.steps.${step.id}.body`);
              const hrefLabel = step.hrefLabel
                ? t(`${baseKey}.steps.${step.id}.hrefLabel`)
                : undefined;
              return (
                <li key={step.id}>
                  <div
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      checked
                        ? "border-primary/25 bg-primary/[0.04]"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggle(step.id)}
                        aria-pressed={checked}
                        aria-label={
                          checked
                            ? t("onboarding.workflows.common.markStepIncomplete", {
                                title: stepTitle,
                              })
                            : t("onboarding.workflows.common.markStepComplete", {
                                title: stepTitle,
                              })
                        }
                        className={cn(
                          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
                          checked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary"
                        )}
                      >
                        {checked ? (
                          <Check className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <span className="text-[10px] font-semibold tabular-nums">
                            {index + 1}
                          </span>
                        )}
                      </button>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <p className="text-sm font-medium leading-snug">
                          {stepTitle}
                        </p>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {stepBody}
                        </p>
                        {step.href && hrefLabel && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-1 h-7 text-xs"
                            render={<Link href={step.href} />}
                            onClick={() => onOpenChange(false)}
                          >
                            {hrefLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          <DialogFooter className="mt-0 flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="justify-start gap-1.5 text-muted-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {t("onboarding.workflows.common.reset")}
            </Button>
            <div className="flex gap-2 sm:justify-end">
              {!progress.completed && (
                <Button variant="ghost" size="sm" onClick={handleSkipOrDone}>
                  {t("onboarding.workflows.common.skip")}
                </Button>
              )}
              <Button size="sm" onClick={handleSkipOrDone}>
                {allChecked || progress.completed
                  ? t("onboarding.workflows.common.done")
                  : t("onboarding.workflows.common.gotIt")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
