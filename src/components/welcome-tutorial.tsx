"use client";

import * as React from "react";
import { Camera, Route, Sparkles, Truck, Workflow } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BrandPartners } from "@/components/brand-partners";
import { useI18n } from "@/components/i18n/use-i18n";
import {
  readLocalStorage,
  writeLocalStorage,
} from "@/lib/safe-storage";
import { WELCOME_TOUR_DONE_KEY } from "@/lib/workflow-onboarding";
import { cn } from "@/lib/utils";

const TOUR_DONE_KEY = WELCOME_TOUR_DONE_KEY;

const STEPS = [
  { icon: Sparkles, titleKey: "onboarding.welcome.step1.title", bodyKey: "onboarding.welcome.step1.description" },
  { icon: Route, titleKey: "onboarding.welcome.step2.title", bodyKey: "onboarding.welcome.step2.description" },
  { icon: Truck, titleKey: "onboarding.welcome.step3.title", bodyKey: "onboarding.welcome.step3.description" },
  { icon: Camera, titleKey: "onboarding.welcome.step4.title", bodyKey: "onboarding.welcome.step4.description" },
  { icon: Workflow, titleKey: "onboarding.welcome.step5.title", bodyKey: "onboarding.welcome.step5.description" },
] as const;

function TourDialog({
  open,
  onFinish,
}: {
  open: boolean;
  onFinish: () => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onFinish()}>
      <DialogContent className="gap-5 sm:max-w-md">
        <DialogHeader className="items-center space-y-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300">
            <Icon className="h-6 w-6" aria-hidden />
          </span>
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground/80">
              {t("onboarding.welcome.stepOf", {
                current: step + 1,
                total: STEPS.length,
              })}
            </p>
            <DialogTitle className="text-lg">{t(current.titleKey)}</DialogTitle>
            <DialogDescription className="text-balance leading-relaxed">
              {t(current.bodyKey)}
            </DialogDescription>
          </div>
        </DialogHeader>

        {step === 0 && (
          <div className="flex justify-center">
            <BrandPartners showLabel={false} />
          </div>
        )}

        <div
          className="flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label={t("onboarding.welcome.tourSteps")}
        >
          {STEPS.map((s, i) => (
            <button
              key={s.titleKey}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={t("onboarding.welcome.goToStep", { step: i + 1 })}
              onClick={() => setStep(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-200",
                i === step
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/25 hover:bg-muted-foreground/40"
              )}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={onFinish}>
            {t("onboarding.welcome.skip")}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
              >
                {t("common.back")}
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => (isLast ? onFinish() : setStep((s) => s + 1))}
            >
              {isLast ? t("onboarding.welcome.getStarted") : t("common.next")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Auto-opens on first visit; "Replay tour" reopens anytime.
 */
export function WelcomeTutorial() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (readLocalStorage(TOUR_DONE_KEY) !== "1") {
      setOpen(true);
    }
  }, []);

  const finish = React.useCallback(() => {
    writeLocalStorage(TOUR_DONE_KEY, "1");
    setOpen(false);
  }, []);

  return (
    <>
      <TourDialog open={open} onFinish={finish} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline"
      >
        {t("onboarding.welcome.replay")}
      </button>
    </>
  );
}
