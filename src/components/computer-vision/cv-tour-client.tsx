"use client";

import * as React from "react";
import Link from "next/link";
import {
  Camera,
  PackageSearch,
  ScanEye,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/components/i18n/use-i18n";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type TourStepId = "load" | "odol" | "hub";

type TourStep = {
  id: TourStepId;
  icon: LucideIcon;
  titleKey: string;
  bodyKey: string;
  metric1LabelKey: string;
  metric1ValueKey: string;
  metric2LabelKey: string;
  metric2ValueKey: string;
  href: string;
  imageSrc?: string;
  liveReady: boolean;
  comingSoon?: boolean;
};

const STEPS: TourStep[] = [
  {
    id: "load",
    icon: PackageSearch,
    titleKey: "cv.tour.steps.load.title",
    bodyKey: "cv.tour.steps.load.body",
    metric1LabelKey: "cv.tour.steps.load.metric1Label",
    metric1ValueKey: "cv.tour.steps.load.metric1Value",
    metric2LabelKey: "cv.tour.steps.load.metric2Label",
    metric2ValueKey: "cv.tour.steps.load.metric2Value",
    href: "/computer-vision/load-detection",
    imageSrc: "/cv-tour/load-detection.gif",
    liveReady: true,
  },
  {
    id: "odol",
    icon: ScanEye,
    titleKey: "cv.tour.steps.odol.title",
    bodyKey: "cv.tour.steps.odol.body",
    metric1LabelKey: "cv.tour.steps.odol.metric1Label",
    metric1ValueKey: "cv.tour.steps.odol.metric1Value",
    metric2LabelKey: "cv.tour.steps.odol.metric2Label",
    metric2ValueKey: "cv.tour.steps.odol.metric2Value",
    href: "/computer-vision/odol-detection",
    liveReady: false,
    comingSoon: true,
  },
  {
    id: "hub",
    icon: Warehouse,
    titleKey: "cv.tour.steps.hub.title",
    bodyKey: "cv.tour.steps.hub.body",
    metric1LabelKey: "cv.tour.steps.hub.metric1Label",
    metric1ValueKey: "cv.tour.steps.hub.metric1Value",
    metric2LabelKey: "cv.tour.steps.hub.metric2Label",
    metric2ValueKey: "cv.tour.steps.hub.metric2Value",
    href: "/computer-vision/hub-congestion-detection",
    imageSrc: "/cv-tour/hub-congestion.gif",
    liveReady: true,
  },
];

export function CvTourClient() {
  const { t } = useI18n();
  const [index, setIndex] = React.useState(0);

  const step = STEPS[index];
  const Icon = step.icon;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("cv.tour.title")}
            </h2>
            <Badge variant="outline">{t("nav.badges.demo")}</Badge>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("cv.tour.subtitle")}
          </p>
        </div>
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label={t("cv.tour.stepsLabel")}
      >
        {STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const active = i === index;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={t(s.titleKey)}
              onClick={() => setIndex(i)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <StepIcon className="h-3.5 w-3.5" />
              {t(s.titleKey)}
              {s.comingSoon ? (
                <Badge variant="outline" className="text-[10px]">
                  {t("common.comingSoon")}
                </Badge>
              ) : null}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader className="gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-lg">{t(step.titleKey)}</CardTitle>
              <CardDescription>{t(step.bodyKey)}</CardDescription>
            </div>
            {step.comingSoon ? (
              <Badge variant="secondary" className="ml-auto">
                {t("common.comingSoon")}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.comingSoon ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border bg-muted/20 px-6 py-12 text-center">
              <p className="text-lg font-semibold">{t("common.comingSoon")}</p>
              <p className="max-w-md text-sm text-muted-foreground">
                {t(step.bodyKey)}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border bg-muted/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withBasePath(step.imageSrc ?? "")}
                  alt={t(step.titleKey)}
                  className="h-auto w-full object-cover"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t(step.metric1LabelKey)}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {t(step.metric1ValueKey)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t(step.metric2LabelKey)}
                  </p>
                  <p className="mt-1 text-xl font-semibold tabular-nums">
                    {t(step.metric2ValueKey)}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            {!step.comingSoon ? (
              <Button render={<Link href={step.href} />}>
                {step.liveReady
                  ? t("cv.tour.openLive")
                  : t("cv.tour.viewPlaceholder")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => setIndex((prev) => (prev + 1) % STEPS.length)}
            >
              {t("cv.tour.nextStep")}
            </Button>
          </div>

          {!step.comingSoon ? (
            <p className="text-xs text-muted-foreground">
              {t("cv.tour.onDeviceNote")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
