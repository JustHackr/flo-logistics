"use client";

import * as React from "react";
import Link from "next/link";
import { Camera, PackageSearch, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/components/i18n/use-i18n";
import { formatDurationSec } from "@/lib/computer-vision/hub-session-report";
import {
  clearCvSessionHistory,
  loadCvSessionHistory,
  summarizeCvSessionHistory,
  type CvSessionHistorySummary,
  type StoredCvSession,
} from "@/lib/computer-vision/session-report-history";
import { formatConfidence } from "@/lib/computer-vision/camera-devices";
import { toIntlLocale, type Locale } from "@/lib/i18n/config";
import type { TranslationParams } from "@/lib/i18n/t";

function formatSessionWhen(ms: number, locale: Locale): string {
  return new Date(ms).toLocaleString(toIntlLocale(locale), {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MetricBox({
  title,
  value,
  detail,
}: {
  title: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        {detail && (
          <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
        )}
      </CardContent>
    </Card>
  );
}

function sessionHeadline(
  session: StoredCvSession,
  t: (key: string, params?: TranslationParams) => string
): string {
  if (session.kind === "load") {
    return t("cv.sessions.peakCapacity", {
      peak: session.report.peakCount,
      max: session.report.maxCapacity,
    });
  }
  return t("cv.sessions.visitsOverstay", {
    visits: session.report.totalVisits,
    percent: session.report.overstayPercent,
  });
}

export function CvSessionReportsPanel({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  const { t, locale } = useI18n();
  const [summary, setSummary] = React.useState<CvSessionHistorySummary | null>(
    null
  );

  const refresh = React.useCallback(() => {
    setSummary(summarizeCvSessionHistory(loadCvSessionHistory()));
  }, []);

  React.useEffect(() => {
    refresh();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === "flo.cvSessionHistory") {
        refresh();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", refresh);
    window.addEventListener("flo:cv-session-saved", refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("flo:cv-session-saved", refresh);
    };
  }, [refresh]);

  if (!summary) return null;

  const panelTitle = title ?? t("cv.sessions.title");
  const panelDescription = description ?? t("cv.sessions.description");

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Camera className="h-4 w-4" />
            {panelTitle}
          </h3>
          <p className="text-sm text-muted-foreground">{panelDescription}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/computer-vision/load-detection" />}
          >
            <PackageSearch className="h-4 w-4" />
            {t("cv.sessions.loadDetection")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link href="/computer-vision/hub-congestion-detection" />}
          >
            <Warehouse className="h-4 w-4" />
            {t("cv.sessions.hubCongestion")}
          </Button>
          {summary.totalSessions > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearCvSessionHistory();
                refresh();
              }}
            >
              {t("cv.sessions.clearHistory")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricBox
          title={t("cv.sessions.sessionsToday")}
          value={summary.sessionsToday}
          detail={t("cv.sessions.storedTotal", {
            count: summary.totalSessions,
          })}
        />
        <MetricBox
          title={t("cv.sessions.loadSessions")}
          value={summary.loadSessions}
          detail={
            summary.avgLoadPeak != null
              ? t("cv.sessions.avgPeak", { count: summary.avgLoadPeak })
              : t("cv.sessions.noLoadSessions")
          }
        />
        <MetricBox
          title={t("cv.sessions.hubSessions")}
          value={summary.hubSessions}
          detail={t("cv.sessions.overstayEvents", {
            count: summary.totalHubOverstays,
          })}
        />
        <MetricBox
          title={t("cv.sessions.latestSignals")}
          value={
            summary.latestLoadPeak != null
              ? summary.latestLoadPeak
              : summary.latestHubOverstayPercent != null
                ? `${summary.latestHubOverstayPercent}%`
                : "—"
          }
          detail={
            summary.latestLoadPeak != null
              ? t("cv.sessions.latestLoadPeak")
              : summary.latestHubOverstayPercent != null
                ? t("cv.sessions.latestHubOverstay")
                : t("cv.sessions.runSession")
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("cv.sessions.recentReports")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {summary.recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("cv.sessions.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("cv.sessions.when")}</TableHead>
                    <TableHead>{t("cv.sessions.type")}</TableHead>
                    <TableHead>{t("cv.sessions.duration")}</TableHead>
                    <TableHead>{t("cv.sessions.summary")}</TableHead>
                    <TableHead>{t("cv.sessions.detail")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary.recent.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatSessionWhen(session.completedAt, locale)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {session.kind === "load"
                            ? t("cv.sessions.load")
                            : t("cv.sessions.hub")}
                        </Badge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {formatDurationSec(session.report.actualDurationSec)}
                        <span className="text-muted-foreground">
                          {" "}
                          / {formatDurationSec(session.report.plannedDurationSec)}
                        </span>
                      </TableCell>
                      <TableCell>{sessionHeadline(session, t)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {session.kind === "load"
                          ? t("cv.sessions.overCap", {
                              duration: formatDurationSec(
                                session.report.overCapacitySec
                              ),
                              confidence: formatConfidence(
                                session.report.averageConfidence
                              ),
                            })
                          : t("cv.sessions.peakOccupied", {
                              peak: session.report.peakConcurrent,
                              duration: formatDurationSec(
                                session.report.occupiedSec
                              ),
                            })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
