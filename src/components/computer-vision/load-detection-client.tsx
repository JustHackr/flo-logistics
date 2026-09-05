"use client";

import * as React from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Package,
  Timer,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { CameraSourceSelect } from "@/components/computer-vision/camera-source-select";
import { CaptureSensitivityControl } from "@/components/computer-vision/capture-sensitivity-control";
import { SessionDurationControls } from "@/components/computer-vision/session-duration-controls";
import {
  DEFAULT_DETECTION_CONFIG,
  detectCartonBoxes,
  getCapacityStatus,
  type DetectedBox,
  type DetectionConfig,
} from "@/lib/computer-vision/box-detector";
import { BoxPassageCounter } from "@/lib/computer-vision/box-passage-counter";
import {
  averageConfidence,
  formatConfidence,
  listVideoInputDevices,
  type VideoInputDevice,
} from "@/lib/computer-vision/camera-devices";
import {
  attachStreamToVideo,
  clearCanvas,
  openCameraStream,
  stopMediaStream,
} from "@/lib/computer-vision/camera-stream";
import {
  buildLoadSessionReport,
  createLoadSessionAccumulator,
  emptyLoadSessionReport,
  recordLoadSample,
  type LoadSessionAccumulator,
  type LoadSessionReport,
} from "@/lib/computer-vision/load-session-report";
import { appendLoadSessionReport } from "@/lib/computer-vision/session-report-history";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import {
  formatClockTime,
  formatDurationSec,
} from "@/lib/computer-vision/hub-session-report";
import {
  DEFAULT_SESSION_DURATION_SEC,
  clampSessionDurationSec,
  isSessionExpired,
  remainingSessionSec,
} from "@/lib/computer-vision/session-timer";
import { useI18n } from "@/components/i18n/use-i18n";

const STORAGE_KEY = "flo.bagMaxCapacity";
const STORAGE_KEY_SESSION = "flo.loadSessionDurationSec";
const DEFAULT_MAX_CAPACITY = 5;
const ANALYSIS_WIDTH = 320;
const DETECTION_INTERVAL_MS = 90;
const DEFAULT_SENSITIVITY = 68;
const DEFAULT_MIN_BLOB = 40;

type CameraState = "idle" | "active" | "error";
type SessionPhase = "idle" | "running" | "completed";

function loadMaxCapacity(): number {
  const stored = readLocalStorage(STORAGE_KEY);
  const parsed = stored ? Number.parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_MAX_CAPACITY;
}

function loadSessionDuration(): number {
  const stored = readLocalStorage(STORAGE_KEY_SESSION);
  const parsed = stored ? Number.parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed)
    ? clampSessionDurationSec(parsed)
    : DEFAULT_SESSION_DURATION_SEC;
}

function sensitivityToConfig(sensitivity: number, minBlobSize: number): Partial<DetectionConfig> {
  const t = Math.min(1, Math.max(0, sensitivity / 100));
  const blobT = Math.min(1, Math.max(0, minBlobSize / 100));
  const huePad = 2 + t * 10;
  return {
    hueMin: Math.max(12, DEFAULT_DETECTION_CONFIG.hueMin - huePad * 0.35),
    hueMax: Math.min(48, DEFAULT_DETECTION_CONFIG.hueMax + huePad * 0.7),
    satMin: Math.max(0.12, DEFAULT_DETECTION_CONFIG.satMin - t * 0.1),
    satMax: Math.min(0.9, DEFAULT_DETECTION_CONFIG.satMax + t * 0.08),
    valMin: Math.max(0.14, DEFAULT_DETECTION_CONFIG.valMin - t * 0.06),
    minArea: Math.round(140 + blobT * 520),
    minConfidence: Math.round((0.5 - t * 0.22) * 100) / 100,
    maxAreaRatio: Math.round((0.1 + t * 0.08) * 100) / 100,
  };
}

function statusBadgeClass(status: ReturnType<typeof getCapacityStatus>) {
  switch (status) {
    case "over_capacity":
      return "destructive";
    case "at_capacity":
      return "outline";
    default:
      return "outline";
  }
}

export function LoadDetectionClient() {
  const { t, locale } = useI18n();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const overlayRef = React.useRef<HTMLCanvasElement>(null);
  const analysisRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const passageCounterRef = React.useRef(new BoxPassageCounter());
  const lastDetectionAtRef = React.useRef(0);
  const lastCountRef = React.useRef(0);
  const lastVisibleRef = React.useRef(0);
  const lastConfidenceRef = React.useRef(0);
  const selectedDeviceIdRef = React.useRef("");
  const analysisCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const overlayCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const detectionConfigRef = React.useRef<Partial<DetectionConfig>>(
    sensitivityToConfig(DEFAULT_SENSITIVITY, DEFAULT_MIN_BLOB)
  );
  const maxCapacityRef = React.useRef(DEFAULT_MAX_CAPACITY);
  const sessionDurationRef = React.useRef(DEFAULT_SESSION_DURATION_SEC);
  const sessionPhaseRef = React.useRef<SessionPhase>("idle");
  const sessionStartedAtRef = React.useRef(0);
  const sessionAccRef = React.useRef<LoadSessionAccumulator | null>(null);
  const lastRemainingRef = React.useRef(-1);
  const finalizeSessionRef = React.useRef<(reason: "timer" | "manual") => void>(
    () => undefined
  );

  const [cameraState, setCameraState] = React.useState<CameraState>("idle");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = React.useState<VideoInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState("");
  const [count, setCount] = React.useState(0);
  const [visibleCount, setVisibleCount] = React.useState(0);
  const [confidence, setConfidence] = React.useState(0);
  const [maxCapacity, setMaxCapacity] = React.useState(DEFAULT_MAX_CAPACITY);
  const [sessionDurationSec, setSessionDurationSec] = React.useState(
    DEFAULT_SESSION_DURATION_SEC
  );
  const [sessionPhase, setSessionPhase] = React.useState<SessionPhase>("idle");
  const [remainingSec, setRemainingSec] = React.useState(DEFAULT_SESSION_DURATION_SEC);
  const [sessionReport, setSessionReport] = React.useState<LoadSessionReport>(
    emptyLoadSessionReport()
  );
  const [sensitivity, setSensitivity] = React.useState(DEFAULT_SENSITIVITY);
  const [minBlobSize, setMinBlobSize] = React.useState(DEFAULT_MIN_BLOB);
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  React.useEffect(() => {
    detectionConfigRef.current = sensitivityToConfig(sensitivity, minBlobSize);
  }, [sensitivity, minBlobSize]);

  React.useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  React.useEffect(() => {
    maxCapacityRef.current = maxCapacity;
  }, [maxCapacity]);

  React.useEffect(() => {
    const clamped = clampSessionDurationSec(sessionDurationSec);
    sessionDurationRef.current = clamped;
    if (clamped !== sessionDurationSec) setSessionDurationSec(clamped);
    if (sessionPhaseRef.current !== "running") {
      setRemainingSec(clamped);
    }
  }, [sessionDurationSec]);

  React.useEffect(() => {
    sessionPhaseRef.current = sessionPhase;
  }, [sessionPhase]);

  React.useEffect(() => {
    void listVideoInputDevices().then(setCameraDevices);
  }, []);

  React.useEffect(() => {
    setMaxCapacity(loadMaxCapacity());
    setSessionDurationSec(loadSessionDuration());
  }, []);

  React.useEffect(() => {
    writeLocalStorage(STORAGE_KEY, String(maxCapacity));
  }, [maxCapacity]);

  React.useEffect(() => {
    writeLocalStorage(
      STORAGE_KEY_SESSION,
      String(clampSessionDurationSec(sessionDurationSec))
    );
  }, [sessionDurationSec]);

  const beginSession = React.useCallback(() => {
    const now = Date.now();
    const duration = sessionDurationRef.current;
    passageCounterRef.current.reset();
    lastCountRef.current = 0;
    lastVisibleRef.current = 0;
    setCount(0);
    setVisibleCount(0);
    sessionStartedAtRef.current = now;
    sessionAccRef.current = createLoadSessionAccumulator(
      duration,
      maxCapacityRef.current,
      now
    );
    lastRemainingRef.current = duration;
    setRemainingSec(duration);
    setSessionPhase("running");
    setSessionReport(emptyLoadSessionReport(duration, maxCapacityRef.current));
  }, []);

  const finalizeSession = React.useCallback((reason: "timer" | "manual") => {
    if (sessionPhaseRef.current !== "running") return;
    const now = Date.now();
    const acc = sessionAccRef.current;
    if (acc) {
      const report = buildLoadSessionReport(acc, now);
      setSessionReport(report);
      appendLoadSessionReport(report, now);
    }
    sessionPhaseRef.current = "completed";
    setSessionPhase("completed");
    setRemainingSec(0);
    void reason;
  }, []);

  React.useEffect(() => {
    finalizeSessionRef.current = finalizeSession;
  }, [finalizeSession]);

  const stopCamera = React.useCallback(() => {
    if (sessionPhaseRef.current === "running") {
      finalizeSessionRef.current("manual");
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    const video = videoRef.current;
    if (video) video.srcObject = null;
    passageCounterRef.current.reset();
    lastDetectionAtRef.current = 0;
    lastCountRef.current = 0;
    lastVisibleRef.current = 0;
    lastConfidenceRef.current = 0;
    analysisCtxRef.current = null;
    clearCanvas(overlayRef.current);
    overlayCtxRef.current = null;
    setCount(0);
    setVisibleCount(0);
    setConfidence(0);
    setCameraState("idle");
  }, []);

  const drawOverlay = React.useCallback(
    (
      tracks: { id: string; box: DetectedBox; confidence: number }[],
      videoWidth: number,
      videoHeight: number
    ) => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      if (overlay.width !== videoWidth || overlay.height !== videoHeight) {
        overlay.width = videoWidth;
        overlay.height = videoHeight;
        overlayCtxRef.current = null;
      }
      const ctx = (overlayCtxRef.current ??= overlay.getContext("2d"));
      if (!ctx) return;
      ctx.clearRect(0, 0, videoWidth, videoHeight);
      ctx.lineWidth = 2;
      ctx.font = "bold 14px sans-serif";
      tracks.forEach((track) => {
        const { box } = track;
        ctx.strokeStyle = "#22c55e";
        ctx.fillStyle = "rgba(34, 197, 94, 0.15)";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = "#22c55e";
        ctx.fillText(
          `#${track.id} ${formatConfidence(track.confidence)}`,
          box.x + 4,
          box.y + 16
        );
      });
    },
    []
  );

  const runDetectionLoop = React.useCallback(() => {
    rafRef.current = requestAnimationFrame(runDetectionLoop);

    const nowPerf = performance.now();
    if (nowPerf - lastDetectionAtRef.current < DETECTION_INTERVAL_MS) return;

    const video = videoRef.current;
    const analysis = analysisRef.current;
    if (!video || !analysis || video.readyState < video.HAVE_CURRENT_DATA) {
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return;

    lastDetectionAtRef.current = nowPerf;
    const nowMs = Date.now();

    if (sessionPhaseRef.current === "running") {
      const remaining = remainingSessionSec(
        sessionStartedAtRef.current,
        sessionDurationRef.current,
        nowMs
      );
      if (remaining !== lastRemainingRef.current) {
        lastRemainingRef.current = remaining;
        setRemainingSec(remaining);
      }
      if (
        isSessionExpired(
          sessionStartedAtRef.current,
          sessionDurationRef.current,
          nowMs
        )
      ) {
        finalizeSessionRef.current("timer");
      }
    }

    const analysisHeight = Math.max(1, Math.round((ANALYSIS_WIDTH * vh) / vw));
    if (analysis.width !== ANALYSIS_WIDTH || analysis.height !== analysisHeight) {
      analysis.width = ANALYSIS_WIDTH;
      analysis.height = analysisHeight;
      analysisCtxRef.current = null;
    }
    const ctx = (analysisCtxRef.current ??= analysis.getContext("2d", {
      willReadFrequently: true,
    }));
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, analysisHeight);
    const imageData = ctx.getImageData(0, 0, ANALYSIS_WIDTH, analysisHeight);
    const result = detectCartonBoxes(imageData, detectionConfigRef.current);

    const scaleX = vw / ANALYSIS_WIDTH;
    const scaleY = vh / analysisHeight;
    const scaledBoxes = result.boxes.map((box) => ({
      x: box.x * scaleX,
      y: box.y * scaleY,
      width: box.width * scaleX,
      height: box.height * scaleY,
      confidence: box.confidence,
    }));

    // Only accumulate pass-through counts during an active timed session.
    const sessionActive = sessionPhaseRef.current === "running";
    const passage = sessionActive
      ? passageCounterRef.current.update(scaledBoxes, nowMs)
      : {
          totalPassed: lastCountRef.current,
          visibleCount: scaledBoxes.length,
          newlyCounted: 0,
          activeTracks: scaledBoxes.map((box, i) => ({
            id: String(i + 1),
            label: `#${i + 1}`,
            dwellSec: 0,
            isOverstay: false,
            box,
            confidence: box.confidence,
          })),
        };

    const frameConfidence = averageConfidence(result.boxes);
    const totalPassed = passage.totalPassed;

    if (sessionActive && sessionAccRef.current) {
      recordLoadSample(sessionAccRef.current, totalPassed, frameConfidence, nowMs);
    }

    if (totalPassed !== lastCountRef.current) {
      lastCountRef.current = totalPassed;
      setCount(totalPassed);
    }
    if (passage.visibleCount !== lastVisibleRef.current) {
      lastVisibleRef.current = passage.visibleCount;
      setVisibleCount(passage.visibleCount);
    }
    if (Math.abs(frameConfidence - lastConfidenceRef.current) >= 0.01) {
      lastConfidenceRef.current = frameConfidence;
      setConfidence(frameConfidence);
    }
    drawOverlay(
      passage.activeTracks.map((track) => ({
        id: track.id,
        box: track.box,
        confidence: track.confidence,
      })),
      vw,
      vh
    );
  }, [drawOverlay]);

  const attachCameraStream = React.useCallback(
    async (stream: MediaStream) => {
      stopMediaStream(streamRef.current);
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopMediaStream(stream);
        throw new Error(t("errors.videoNotReady"));
      }
      await attachStreamToVideo(video, stream);
      setCameraState("active");
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(runDetectionLoop);
      }
      const devices = await listVideoInputDevices();
      setCameraDevices(devices);
      const activeId = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (activeId) {
        setSelectedDeviceId(activeId);
      } else if (devices.length > 0 && !selectedDeviceIdRef.current) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    },
    [runDetectionLoop, t]
  );

  const startCamera = React.useCallback(
    async (deviceId?: string) => {
      setCameraError(null);
      try {
        const stream = await openCameraStream({
          deviceId: deviceId ?? selectedDeviceIdRef.current,
        });
        await attachCameraStream(stream);
        beginSession();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t("errors.cameraAccess");
        setCameraError(message);
        setCameraState("error");
        stopCamera();
      }
    },
    [attachCameraStream, beginSession, stopCamera, t]
  );

  const switchCamera = React.useCallback(
    async (deviceId: string) => {
      setSelectedDeviceId(deviceId);
      if (cameraState !== "active") return;
      try {
        const stream = await openCameraStream({ deviceId });
        await attachCameraStream(stream);
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : t("errors.cameraSwitch")
        );
      }
    },
    [attachCameraStream, cameraState, t]
  );

  const endSessionEarly = React.useCallback(() => {
    finalizeSession("manual");
  }, [finalizeSession]);

  React.useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capacityStatus = getCapacityStatus(count, maxCapacity);
  const translatedStatusLabel = (status: ReturnType<typeof getCapacityStatus>) =>
    t(`cv.load.status.${status}`);
  const isOverCapacity = capacityStatus === "over_capacity";
  const showReport = sessionPhase === "completed" || sessionReport.sampleCount > 0;

  return (
    <div lang={locale} className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("cv.load.title")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("cv.load.description")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t("cv.load.liveFeed")}
            </CardTitle>
            <CardDescription>
              {t("cv.load.liveFeedHint")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              <canvas
                ref={overlayRef}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover"
              />
              {cameraState === "idle" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950 px-6 text-center text-zinc-100">
                  <CameraOff className="h-8 w-8 text-zinc-400" />
                  <p className="text-base font-semibold tracking-tight">
                    {t("cv.load.howTo.ready")}
                  </p>
                  <ol className="max-w-md space-y-1.5 text-left text-sm text-zinc-300">
                    <li>
                      <span className="font-medium text-white">1.</span>{" "}
                      {t("cv.load.howTo.step1")}
                    </li>
                    <li>
                      <span className="font-medium text-white">2.</span>{" "}
                      {t("cv.load.howTo.step2")}
                    </li>
                    <li>
                      <span className="font-medium text-white">3.</span>{" "}
                      {t("cv.load.howTo.step3")}
                    </li>
                    <li>
                      <span className="font-medium text-white">4.</span>{" "}
                      {t("cv.load.howTo.step4")}
                    </li>
                  </ol>
                  <p className="text-xs text-zinc-500">
                    {t("cv.load.howTo.note")}
                  </p>
                </div>
              )}
              {sessionPhase === "running" && (
                <div className="absolute top-3 right-3 rounded-md bg-black/70 px-2.5 py-1 font-mono text-sm text-white">
                  {formatDurationSec(remainingSec)}
                </div>
              )}
            </div>
            <canvas ref={analysisRef} className="hidden" aria-hidden />
            <div className="flex flex-wrap items-end gap-2">
              {cameraState === "active" ? (
                <Button variant="outline" onClick={stopCamera}>
                  <CameraOff className="h-4 w-4" />
                  {t("cv.controls.stopCamera")}
                </Button>
              ) : (
                <Button onClick={() => void startCamera()}>
                  <Camera className="h-4 w-4" />
                  {t("cv.controls.startCamera")}
                </Button>
              )}
              {sessionPhase === "running" && (
                <Button variant="secondary" onClick={endSessionEarly}>
                  <Timer className="h-4 w-4" />
                  {t("cv.controls.endSession")}
                </Button>
              )}
              <CameraSourceSelect
                devices={cameraDevices}
                value={selectedDeviceId}
                onValueChange={(deviceId) => {
                  if (cameraState === "active") {
                    void switchCamera(deviceId);
                  } else {
                    setSelectedDeviceId(deviceId);
                  }
                }}
              />
              {sessionPhase === "running" && (
                <Badge variant="outline">{t("cv.controls.sessionRunning")}</Badge>
              )}
              {sessionPhase === "completed" && (
                <Badge variant="secondary">{t("cv.controls.sessionComplete")}</Badge>
              )}
            </div>
            {cameraError && (
              <p className="text-sm text-destructive">{cameraError}</p>
            )}
            <CaptureSensitivityControl
              id="load-capture-sensitivity"
              value={sensitivity}
              onChange={setSensitivity}
              label={t("cv.load.captureSensitivity")}
              hint={t("cv.load.captureSensitivityHint")}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                {t("cv.controls.sessionTiming")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SessionDurationControls
                valueSec={sessionDurationSec}
                onChange={setSessionDurationSec}
                disabled={sessionPhase === "running"}
                id="load-session-duration"
              />
            </CardContent>
          </Card>

          <Card
            className={cn(
              isOverCapacity && "ring-2 ring-destructive/50"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t("cv.load.loadStatus")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("cv.load.totalCounted")}
                  </p>
                  <p className="text-4xl font-bold tabular-nums">
                    {count}
                    <span className="text-lg font-normal text-muted-foreground">
                      {" "}
                      / {maxCapacity}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("cv.load.inViewNow", { count: visibleCount })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t("cv.load.confidence")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatConfidence(confidence)}
                  </p>
                </div>
                <Badge
                  variant={statusBadgeClass(capacityStatus)}
                  className={cn(
                    capacityStatus === "at_capacity" &&
                      "border-amber-500/50 text-amber-700 dark:text-amber-400",
                    capacityStatus === "ok" &&
                      "border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                  )}
                >
                  {translatedStatusLabel(capacityStatus)}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-capacity">{t("cv.load.maxCapacity")}</Label>
                <Input
                  id="max-capacity"
                  type="number"
                  min={1}
                  max={99}
                  value={maxCapacity}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(next) && next >= 1) {
                      setMaxCapacity(next);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {t("cv.load.maxCapacityHint")}
                </p>
              </div>
            </CardContent>
          </Card>

          {isOverCapacity && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {t("cv.load.overCapacityTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("cv.load.overCapacityMessage", { count, max: maxCapacity })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {capacityStatus === "at_capacity" && !isOverCapacity && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="flex items-start gap-3 pt-4">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">
                    {t("cv.load.atCapacityTitle")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("cv.load.atCapacityMessage", { max: maxCapacity })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {showReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  {t("cv.load.report")}
                </CardTitle>
                <CardDescription>
                  {t("cv.load.reportDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.planned")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatDurationSec(sessionReport.plannedDurationSec)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.actual")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatDurationSec(sessionReport.actualDurationSec)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.totalCounted")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {sessionReport.finalCount}/{sessionReport.maxCapacity}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.peakTotal")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {sessionReport.peakCount}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.avgConfidence")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatConfidence(sessionReport.averageConfidence)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.atCapacity")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums">
                      {formatDurationSec(sessionReport.atCapacitySec)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">
                      {t("cv.load.reportMetrics.overCapacity")}
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-destructive">
                      {formatDurationSec(sessionReport.overCapacitySec)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("cv.load.reportMetrics.overCapacityEvents", {
                    count: sessionReport.overCapacityEventCount,
                  })}
                </p>

                {sessionReport.countEvents.length > 1 ? (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("cv.load.events.time")}</TableHead>
                          <TableHead>{t("cv.load.events.count")}</TableHead>
                          <TableHead>{t("cv.load.events.status")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessionReport.countEvents.map((event, i) => (
                          <TableRow key={`${event.atMs}-${i}`}>
                            <TableCell className="tabular-nums">
                              {formatClockTime(event.atMs)}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {event.count}
                            </TableCell>
                            <TableCell>{translatedStatusLabel(event.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("cv.load.events.empty")}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <CardTitle className="text-sm">
                  {t("cv.load.settings.title")}
                </CardTitle>
                {settingsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <CardDescription>
                {t("cv.load.settings.description")}
              </CardDescription>
            </CardHeader>
            {settingsOpen && (
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="min-blob">
                      {t("cv.load.settings.minimumBoxSize")}
                    </Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {minBlobSize}%
                    </span>
                  </div>
                  <input
                    id="min-blob"
                    type="range"
                    min={0}
                    max={100}
                    value={minBlobSize}
                    onChange={(e) =>
                      setMinBlobSize(Number.parseInt(e.target.value, 10))
                    }
                    className="w-full accent-primary"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
