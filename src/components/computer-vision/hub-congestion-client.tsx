"use client";

import * as React from "react";
import {
  AlertTriangle,
  Camera,
  CameraOff,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  RefreshCw,
  Scan,
  Timer,
  Warehouse,
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
import type { DetectedBox } from "@/lib/computer-vision/box-detector";
import {
  DEFAULT_PLATFORM_ZONE,
  clampPlatformZone,
  detectForegroundObjects,
  sensitivityToForegroundConfig,
  type PlatformZone,
} from "@/lib/computer-vision/foreground-detector";
import {
  buildSessionReport,
  createHubSessionAccumulator,
  formatClockTime,
  formatDurationSec,
  recordHubOccupancySample,
  type HubSessionAccumulator,
  type SessionReport,
} from "@/lib/computer-vision/hub-session-report";
import { appendHubSessionReport } from "@/lib/computer-vision/session-report-history";
import { readLocalStorage, writeLocalStorage } from "@/lib/safe-storage";
import {
  DEFAULT_TRACKER_CONFIG,
  ObjectTracker,
  detectionFromBox,
  type ActiveTrack,
  type TrackerConfig,
} from "@/lib/computer-vision/object-tracker";
import {
  DEFAULT_SESSION_DURATION_SEC,
  clampSessionDurationSec,
  isSessionExpired,
  remainingSessionSec,
} from "@/lib/computer-vision/session-timer";
import { useI18n } from "@/components/i18n/use-i18n";

const STORAGE_KEY_MAX_DURATION = "flo.hubMaxDurationSec";
const STORAGE_KEY_SESSION = "flo.hubSessionDurationSec";
const STORAGE_KEY_ZONE = "flo.hubPlatformZone";
const AUTO_CALIBRATE_COUNTDOWN_SEC = 5;
const DEFAULT_MAX_DURATION_SEC = 30;
const ANALYSIS_WIDTH = 320;
const DETECTION_INTERVAL_MS = 90;

type CameraState = "idle" | "active" | "error";
type SessionPhase = "idle" | "running" | "completed";

function loadMaxDuration(): number {
  const stored = readLocalStorage(STORAGE_KEY_MAX_DURATION);
  const parsed = stored ? Number.parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : DEFAULT_MAX_DURATION_SEC;
}

function loadSessionDuration(): number {
  const stored = readLocalStorage(STORAGE_KEY_SESSION);
  const parsed = stored ? Number.parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed)
    ? clampSessionDurationSec(parsed)
    : DEFAULT_SESSION_DURATION_SEC;
}

function loadPlatformZone(): PlatformZone {
  try {
    const stored = readLocalStorage(STORAGE_KEY_ZONE);
    if (!stored) return DEFAULT_PLATFORM_ZONE;
    const parsed = JSON.parse(stored) as PlatformZone;
    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return parsed;
    }
  } catch {
    /* use default */
  }
  return DEFAULT_PLATFORM_ZONE;
}

function scaleBox(
  box: DetectedBox,
  scaleX: number,
  scaleY: number
): DetectedBox {
  return {
    x: box.x * scaleX,
    y: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
    confidence: box.confidence,
  };
}

function tracksSignature(tracks: ActiveTrack[]): string {
  return tracks
    .map((t) => `${t.id}:${Math.floor(t.dwellSec)}:${t.isOverstay}`)
    .join("|");
}

function reportSignature(report: SessionReport): string {
  return `${report.totalVisits}:${report.overstayCount}:${report.averageStaySec}:${report.peakConcurrent}:${report.occupiedSec}`;
}

function clampZoneSliders(
  sizePct: number,
  xPct: number,
  yPct: number
): { size: number; x: number; y: number } {
  const size = Math.min(70, Math.max(20, sizePct));
  const maxPos = 100 - size;
  return {
    size,
    x: Math.min(maxPos, Math.max(0, xPct)),
    y: Math.min(maxPos, Math.max(0, yPct)),
  };
}

export function HubCongestionClient() {
  const { t, locale } = useI18n();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const overlayRef = React.useRef<HTMLCanvasElement>(null);
  const analysisRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastDetectionAtRef = React.useRef(0);
  const backgroundRef = React.useRef<ImageData | null>(null);
  const trackerRef = React.useRef(new ObjectTracker());
  const analysisCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const overlayCtxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const foregroundConfigRef = React.useRef(sensitivityToForegroundConfig(80, 25));
  const trackerConfigRef = React.useRef<TrackerConfig>({
    ...DEFAULT_TRACKER_CONFIG,
    maxDurationSec: DEFAULT_MAX_DURATION_SEC,
  });
  const zoneRef = React.useRef<PlatformZone>(DEFAULT_PLATFORM_ZONE);
  const lastTracksSigRef = React.useRef("");
  const lastReportSigRef = React.useRef("");
  const settingsHydratedRef = React.useRef(false);
  const calibratedRef = React.useRef(false);
  const selectedDeviceIdRef = React.useRef("");
  const sessionDurationRef = React.useRef(DEFAULT_SESSION_DURATION_SEC);
  const sessionPhaseRef = React.useRef<SessionPhase>("idle");
  const sessionStartedAtRef = React.useRef(0);
  const sessionAccRef = React.useRef<HubSessionAccumulator | null>(null);
  const lastRemainingRef = React.useRef(-1);
  const finalizeSessionRef = React.useRef<(reason: "timer" | "manual") => void>(
    () => undefined
  );

  const [cameraState, setCameraState] = React.useState<CameraState>("idle");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [cameraDevices, setCameraDevices] = React.useState<VideoInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState("");
  const [calibrated, setCalibrated] = React.useState(false);
  const [autoCalibrateSec, setAutoCalibrateSec] = React.useState<number | null>(
    null
  );
  const autoCalibrateTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const [maxDurationSec, setMaxDurationSec] = React.useState(DEFAULT_MAX_DURATION_SEC);
  const [sessionDurationSec, setSessionDurationSec] = React.useState(
    DEFAULT_SESSION_DURATION_SEC
  );
  const [sessionPhase, setSessionPhase] = React.useState<SessionPhase>("idle");
  const [remainingSec, setRemainingSec] = React.useState(DEFAULT_SESSION_DURATION_SEC);
  const [zoneSize, setZoneSize] = React.useState(40);
  const [zoneX, setZoneX] = React.useState(30);
  const [zoneY, setZoneY] = React.useState(30);
  const [sensitivity, setSensitivity] = React.useState(80);
  const [minObjectSize, setMinObjectSize] = React.useState(25);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [activeTracks, setActiveTracks] = React.useState<ActiveTrack[]>([]);
  const [sessionReport, setSessionReport] = React.useState<SessionReport>(
    buildSessionReport([])
  );

  React.useEffect(() => {
    const loadedDuration = loadMaxDuration();
    const loadedSession = loadSessionDuration();
    const loadedZone = loadPlatformZone();
    const clamped = clampPlatformZone(loadedZone);
    setMaxDurationSec(loadedDuration);
    setSessionDurationSec(loadedSession);
    trackerConfigRef.current = {
      ...DEFAULT_TRACKER_CONFIG,
      maxDurationSec: loadedDuration,
    };
    zoneRef.current = clamped;
    setZoneSize(Math.round(clamped.width * 100));
    setZoneX(Math.round(clamped.x * 100));
    setZoneY(Math.round(clamped.y * 100));
    settingsHydratedRef.current = true;
  }, []);

  React.useEffect(() => {
    void listVideoInputDevices().then(setCameraDevices);
  }, []);

  React.useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
  }, [selectedDeviceId]);

  React.useEffect(() => {
    const clamped = clampSessionDurationSec(sessionDurationSec);
    sessionDurationRef.current = clamped;
    if (clamped !== sessionDurationSec) setSessionDurationSec(clamped);
    if (sessionPhaseRef.current !== "running") {
      setRemainingSec(clamped);
    }
    if (!settingsHydratedRef.current || typeof window === "undefined") return;
    writeLocalStorage(STORAGE_KEY_SESSION, String(clamped));
  }, [sessionDurationSec]);

  React.useEffect(() => {
    sessionPhaseRef.current = sessionPhase;
  }, [sessionPhase]);

  React.useEffect(() => {
    trackerConfigRef.current = {
      ...DEFAULT_TRACKER_CONFIG,
      maxDurationSec: maxDurationSec,
    };
    if (!settingsHydratedRef.current || typeof window === "undefined") return;
    writeLocalStorage(STORAGE_KEY_MAX_DURATION, String(maxDurationSec));
  }, [maxDurationSec]);

  React.useEffect(() => {
    const clampedSliders = clampZoneSliders(zoneSize, zoneX, zoneY);
    if (
      clampedSliders.size !== zoneSize ||
      clampedSliders.x !== zoneX ||
      clampedSliders.y !== zoneY
    ) {
      setZoneSize(clampedSliders.size);
      setZoneX(clampedSliders.x);
      setZoneY(clampedSliders.y);
      return;
    }
    const nextZone = clampPlatformZone({
      x: zoneX / 100,
      y: zoneY / 100,
      width: zoneSize / 100,
      height: zoneSize / 100,
    });
    zoneRef.current = nextZone;
    if (!settingsHydratedRef.current || typeof window === "undefined") return;
    writeLocalStorage(STORAGE_KEY_ZONE, JSON.stringify(nextZone));
  }, [zoneSize, zoneX, zoneY]);

  React.useEffect(() => {
    foregroundConfigRef.current = sensitivityToForegroundConfig(
      sensitivity,
      minObjectSize
    );
  }, [sensitivity, minObjectSize]);

  const clearOverlay = React.useCallback(() => {
    const overlay = overlayRef.current;
    const ctx = overlayCtxRef.current;
    if (overlay && ctx) {
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }
  }, []);

  const beginSession = React.useCallback(() => {
    const now = Date.now();
    const duration = sessionDurationRef.current;
    trackerRef.current.reset();
    lastTracksSigRef.current = "";
    lastReportSigRef.current = "";
    sessionStartedAtRef.current = now;
    sessionAccRef.current = createHubSessionAccumulator(duration, now);
    lastRemainingRef.current = duration;
    setRemainingSec(duration);
    setActiveTracks([]);
    setSessionReport(
      buildSessionReport([], {
        plannedDurationSec: duration,
        startedAtMs: now,
        endedAtMs: now,
        accumulator: sessionAccRef.current,
      })
    );
    setSessionPhase("running");
  }, []);

  const finalizeSession = React.useCallback((reason: "timer" | "manual") => {
    if (sessionPhaseRef.current !== "running") return;
    const now = Date.now();
    const report = buildSessionReport(trackerRef.current.getCompletedVisits(), {
      plannedDurationSec: sessionDurationRef.current,
      startedAtMs: sessionStartedAtRef.current,
      endedAtMs: now,
      accumulator: sessionAccRef.current,
    });
    lastReportSigRef.current = reportSignature(report);
    setSessionReport(report);
    appendHubSessionReport(report, now);
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
    lastDetectionAtRef.current = 0;
    analysisCtxRef.current = null;
    clearOverlay();
    clearCanvas(overlayRef.current);
    overlayCtxRef.current = null;
    setActiveTracks([]);
    setCameraState("idle");
  }, [clearOverlay]);

  const resetSession = React.useCallback(() => {
    trackerRef.current.reset();
    lastTracksSigRef.current = "";
    lastReportSigRef.current = "";
    setActiveTracks([]);
    if (sessionPhaseRef.current === "running") {
      beginSession();
      return;
    }
    setSessionPhase("idle");
    setRemainingSec(sessionDurationRef.current);
    setSessionReport(
      buildSessionReport([], {
        plannedDurationSec: sessionDurationRef.current,
      })
    );
  }, [beginSession]);

  const captureAnalysisFrame = React.useCallback((): ImageData | null => {
    const video = videoRef.current;
    const analysis = analysisRef.current;
    if (!video || !analysis || video.readyState < video.HAVE_CURRENT_DATA) {
      return null;
    }
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return null;

    // Once calibrated, lock analysis size to the background frame so a 1px
    // video-size flicker cannot wipe detection.
    const background = backgroundRef.current;
    const analysisWidth = background?.width ?? ANALYSIS_WIDTH;
    const analysisHeight =
      background?.height ??
      Math.max(1, Math.round((ANALYSIS_WIDTH * vh) / vw));

    if (analysis.width !== analysisWidth || analysis.height !== analysisHeight) {
      analysis.width = analysisWidth;
      analysis.height = analysisHeight;
      analysisCtxRef.current = null;
    }

    const ctx = (analysisCtxRef.current ??= analysis.getContext("2d", {
      willReadFrequently: true,
    }));
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, analysisWidth, analysisHeight);
    return ctx.getImageData(0, 0, analysisWidth, analysisHeight);
  }, []);

  const clearAutoCalibrate = React.useCallback(() => {
    if (autoCalibrateTimerRef.current !== null) {
      clearInterval(autoCalibrateTimerRef.current);
      autoCalibrateTimerRef.current = null;
    }
    setAutoCalibrateSec(null);
  }, []);

  const calibratePlatform = React.useCallback((): boolean => {
    // Force a fresh canvas size from the live video before capturing background.
    backgroundRef.current = null;
    calibratedRef.current = false;
    const video = videoRef.current;
    const analysis = analysisRef.current;
    if (!video || !analysis || video.readyState < video.HAVE_CURRENT_DATA) {
      return false;
    }
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return false;

    const analysisHeight = Math.max(1, Math.round((ANALYSIS_WIDTH * vh) / vw));
    analysis.width = ANALYSIS_WIDTH;
    analysis.height = analysisHeight;
    analysisCtxRef.current = null;

    const ctx = (analysisCtxRef.current ??= analysis.getContext("2d", {
      willReadFrequently: true,
    }));
    if (!ctx) return false;

    ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, analysisHeight);
    const frame = ctx.getImageData(0, 0, ANALYSIS_WIDTH, analysisHeight);
    backgroundRef.current = {
      data: new Uint8ClampedArray(frame.data),
      width: frame.width,
      height: frame.height,
    } as ImageData;
    calibratedRef.current = true;
    setCalibrated(true);
    clearAutoCalibrate();
    trackerRef.current.reset();
    lastTracksSigRef.current = "";
    setActiveTracks([]);
    return true;
  }, [clearAutoCalibrate]);

  const startAutoCalibrate = React.useCallback(() => {
    clearAutoCalibrate();
    let remaining = AUTO_CALIBRATE_COUNTDOWN_SEC;
    setAutoCalibrateSec(remaining);
    autoCalibrateTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        if (autoCalibrateTimerRef.current !== null) {
          clearInterval(autoCalibrateTimerRef.current);
          autoCalibrateTimerRef.current = null;
        }
        setAutoCalibrateSec(null);
        if (calibratedRef.current) return;
        const ok = calibratePlatform();
        if (!ok) {
          // Video frame not ready yet — try again shortly.
          window.setTimeout(() => {
            if (!calibratedRef.current) calibratePlatform();
          }, 750);
        }
        return;
      }
      setAutoCalibrateSec(remaining);
    }, 1000);
  }, [calibratePlatform, clearAutoCalibrate]);

  React.useEffect(() => {
    if (cameraState === "active" && !calibrated) {
      startAutoCalibrate();
      return () => clearAutoCalibrate();
    }
    clearAutoCalibrate();
    return () => clearAutoCalibrate();
  }, [cameraState, calibrated, startAutoCalibrate, clearAutoCalibrate]);

  const drawOverlay = React.useCallback(
    (
      tracks: ActiveTrack[],
      videoWidth: number,
      videoHeight: number,
      platformZone: PlatformZone,
      hasOverstay: boolean
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

      const zx = platformZone.x * videoWidth;
      const zy = platformZone.y * videoHeight;
      const zw = platformZone.width * videoWidth;
      const zh = platformZone.height * videoHeight;

      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = hasOverstay ? "#ef4444" : "#f59e0b";
      ctx.strokeRect(zx, zy, zw, zh);
      ctx.setLineDash([]);

      ctx.font = "bold 13px sans-serif";
      for (const track of tracks) {
        const { box } = track;
        const color = track.isOverstay ? "#ef4444" : "#22c55e";
        ctx.strokeStyle = color;
        ctx.fillStyle = track.isOverstay
          ? "rgba(239, 68, 68, 0.15)"
          : "rgba(34, 197, 94, 0.15)";
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        ctx.fillStyle = color;
        const label = track.isOverstay
          ? `${track.label} — ${formatDurationSec(track.dwellSec)} ${formatConfidence(track.confidence)} OVERSTAY`
          : `${track.label} — ${formatDurationSec(track.dwellSec)} ${formatConfidence(track.confidence)}`;
        ctx.fillText(label, box.x + 4, Math.max(14, box.y - 4));
      }
    },
    []
  );

  const runDetectionLoop = React.useCallback(() => {
    rafRef.current = requestAnimationFrame(runDetectionLoop);

    const nowPerf = performance.now();
    if (nowPerf - lastDetectionAtRef.current < DETECTION_INTERVAL_MS) return;

    const frame = captureAnalysisFrame();
    if (!frame) return;

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

    const video = videoRef.current;
    if (!video) return;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const scaleX = vw / Math.max(1, frame.width);
    const scaleY = vh / Math.max(1, frame.height);

    let tracks: ActiveTrack[] = [];
    const background = backgroundRef.current;

    if (background) {
      const result = detectForegroundObjects(
        frame,
        background,
        zoneRef.current,
        foregroundConfigRef.current
      );
      const detections = result.boxes.map((box) =>
        detectionFromBox(scaleBox(box, scaleX, scaleY))
      );
      const update = trackerRef.current.update(
        detections,
        nowMs,
        trackerConfigRef.current
      );
      tracks = update.activeTracks;

      if (sessionPhaseRef.current === "running" && sessionAccRef.current) {
        recordHubOccupancySample(
          sessionAccRef.current,
          tracks.length,
          nowMs
        );
      }

      if (update.newVisits.length > 0) {
        const report = buildSessionReport(
          trackerRef.current.getCompletedVisits(),
          {
            plannedDurationSec: sessionDurationRef.current,
            startedAtMs: sessionStartedAtRef.current || undefined,
            endedAtMs: nowMs,
          }
        );
        const reportSig = `${report.totalVisits}:${report.overstayCount}:${report.averageStaySec}`;
        if (reportSig !== lastReportSigRef.current) {
          lastReportSigRef.current = reportSig;
          setSessionReport(report);
        }
      }
    }

    const tracksSig = tracksSignature(tracks);
    if (tracksSig !== lastTracksSigRef.current) {
      lastTracksSigRef.current = tracksSig;
      setActiveTracks(tracks);
    }

    drawOverlay(
      tracks,
      vw,
      vh,
      zoneRef.current,
      tracks.some((t) => t.isOverstay)
    );
  }, [captureAnalysisFrame, drawOverlay]);

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
      backgroundRef.current = null;
      calibratedRef.current = false;
      setCalibrated(false);
      try {
        const stream = await openCameraStream({
          deviceId: deviceId ?? selectedDeviceIdRef.current,
        });
        await attachCameraStream(stream);
        beginSession();
      } catch (err) {
        setCameraError(
          err instanceof Error ? err.message : t("errors.cameraAccess")
        );
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
      backgroundRef.current = null;
      calibratedRef.current = false;
      setCalibrated(false);
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

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  const hasOverstay = activeTracks.some((t) => t.isOverstay);

  return (
    <div lang={locale} className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("cv.hub.title")}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("cv.hub.description")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {t("cv.hub.liveFeed")}
            </CardTitle>
            <CardDescription>
              {t("cv.hub.liveFeedHint")}
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
                    {t("cv.hub.howTo.ready")}
                  </p>
                  <ol className="max-w-md space-y-1.5 text-left text-sm text-zinc-300">
                    <li>
                      <span className="font-medium text-white">1.</span>{" "}
                      {t("cv.hub.howTo.step1")}
                    </li>
                    <li>
                      <span className="font-medium text-white">2.</span>{" "}
                      {t("cv.hub.howTo.step2")}
                    </li>
                    <li>
                      <span className="font-medium text-white">3.</span>{" "}
                      {t("cv.hub.howTo.step3")}
                    </li>
                    <li>
                      <span className="font-medium text-white">4.</span>{" "}
                      {t("cv.hub.howTo.step4")}
                    </li>
                  </ol>
                  <p className="text-xs text-zinc-500">
                    {t("cv.hub.howTo.note")}
                  </p>
                </div>
              )}
              {cameraState === "active" && !calibrated && (
                <button
                  type="button"
                  onClick={() => {
                    calibratePlatform();
                  }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/55 px-6 text-center transition-colors hover:bg-black/65"
                >
                  <p className="hub-calibrate-glow text-3xl font-black tracking-wide text-amber-300 sm:text-4xl">
                    {t("cv.hub.calibration.clearSquare")}
                  </p>
                  <p className="hub-calibrate-glow text-xl font-bold text-white sm:text-2xl">
                    {t("cv.hub.calibration.thenCalibrate")}
                  </p>
                  <p className="max-w-md text-sm text-amber-100/95 sm:text-base">
                    {t("cv.hub.calibration.keepEmpty")}
                  </p>
                  {autoCalibrateSec != null ? (
                    <p className="rounded-full border border-amber-300/50 bg-amber-400/20 px-4 py-1.5 font-mono text-lg font-semibold text-amber-100">
                      {t("cv.hub.calibration.autoIn", { seconds: autoCalibrateSec })}
                    </p>
                  ) : (
                    <p className="rounded-full border border-amber-300/50 bg-amber-400/20 px-4 py-1.5 text-sm font-semibold text-amber-100">
                      {t("cv.hub.calibration.tapNow")}
                    </p>
                  )}
                </button>
              )}
              {sessionPhase === "running" && (
                <div className="absolute top-3 right-3 z-20 rounded-md bg-black/70 px-2.5 py-1 font-mono text-sm text-white">
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
                <Button variant="secondary" onClick={endSessionEarly}>
                  <Timer className="h-4 w-4" />
                  {t("cv.controls.endSession")}
                </Button>
              )}
              <Button
                variant={calibrated ? "outline" : "default"}
                size={calibrated ? "default" : "lg"}
                onClick={() => {
                  calibratePlatform();
                }}
                disabled={cameraState !== "active"}
                className={cn(
                  !calibrated &&
                    cameraState === "active" &&
                    "hub-calibrate-button animate-pulse"
                )}
              >
                <Scan className="h-4 w-4" />
                {calibrated ? t("cv.hub.recalibrate") : t("cv.hub.calibrateNow")}
              </Button>
              {cameraState === "active" && !calibrated && autoCalibrateSec != null && (
                <Button variant="ghost" size="sm" onClick={clearAutoCalibrate}>
                  {t("cv.hub.cancelAutoCalibrate")}
                </Button>
              )}
              <Button variant="outline" onClick={resetSession}>
                <RefreshCw className="h-4 w-4" />
                {t("cv.controls.resetSession")}
              </Button>
              <Badge variant={calibrated ? "outline" : "destructive"}>
                {calibrated ? t("cv.hub.calibrated") : t("cv.hub.notCalibrated")}
              </Badge>
              {sessionPhase === "running" && (
                <Badge variant="outline">{t("cv.controls.sessionRunning")}</Badge>
              )}
              {sessionPhase === "completed" && (
                <Badge variant="secondary">{t("cv.controls.sessionComplete")}</Badge>
              )}
            </div>
            {cameraState === "active" && !calibrated && (
              <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                {t("cv.hub.calibration.instructions", {
                  countdown: autoCalibrateSec != null ? ` (${autoCalibrateSec}s)` : "",
                })}
              </p>
            )}
            {cameraState === "active" && calibrated && (
              <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:text-emerald-200">
                {t("cv.hub.calibration.success")}
              </p>
            )}
            {cameraError && (
              <p className="text-sm text-destructive">{cameraError}</p>
            )}
            <CaptureSensitivityControl
              id="hub-capture-sensitivity"
              value={sensitivity}
              onChange={setSensitivity}
              label={t("cv.hub.captureSensitivity")}
              hint={t("cv.hub.captureSensitivityHint")}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-4 w-4" />
                {t("cv.hub.dwellSettings")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SessionDurationControls
                valueSec={sessionDurationSec}
                onChange={setSessionDurationSec}
                disabled={sessionPhase === "running"}
                id="hub-session-duration"
              />

              <div className="space-y-2">
                <Label htmlFor="max-duration">{t("cv.hub.maxStayDuration")}</Label>
                <Input
                  id="max-duration"
                  type="number"
                  min={1}
                  max={3600}
                  value={maxDurationSec}
                  onChange={(e) => {
                    const next = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(next) && next >= 1) {
                      setMaxDurationSec(next);
                    }
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {t("cv.hub.maxStayHint")}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="zone-size">{t("cv.hub.zoneSize")}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {zoneSize}%
                  </span>
                </div>
                <input
                  id="zone-size"
                  type="range"
                  min={20}
                  max={70}
                  value={zoneSize}
                  onChange={(e) =>
                    setZoneSize(Number.parseInt(e.target.value, 10))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex items-center justify-between">
                  <Label htmlFor="zone-x">{t("cv.hub.zoneX")}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {zoneX}%
                  </span>
                </div>
                <input
                  id="zone-x"
                  type="range"
                  min={0}
                  max={100 - zoneSize}
                  value={zoneX}
                  onChange={(e) =>
                    setZoneX(Number.parseInt(e.target.value, 10))
                  }
                  className="w-full accent-primary"
                />
                <div className="flex items-center justify-between">
                  <Label htmlFor="zone-y">{t("cv.hub.zoneY")}</Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {zoneY}%
                  </span>
                </div>
                <input
                  id="zone-y"
                  type="range"
                  min={0}
                  max={100 - zoneSize}
                  value={zoneY}
                  onChange={(e) =>
                    setZoneY(Number.parseInt(e.target.value, 10))
                  }
                  className="w-full accent-primary"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                {t("cv.hub.activeOnPlatform")}
              </CardTitle>
              <CardDescription>
                {activeTracks.length === 0
                  ? t("cv.hub.noObjects")
                  : t("cv.hub.objectsTracked", { count: activeTracks.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeTracks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("cv.hub.placeObject")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {activeTracks.map((track) => (
                    <li
                      key={track.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                    >
                      <span>{track.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono tabular-nums">
                          {formatDurationSec(track.dwellSec)}
                        </span>
                        <Badge variant="secondary">
                          {formatConfidence(track.confidence)}
                        </Badge>
                        {track.isOverstay && (
                          <Badge variant="destructive">{t("cv.hub.overstay")}</Badge>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {hasOverstay && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-start gap-3 pt-4">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">
                    {t("cv.hub.overstayDetected")}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("cv.hub.overstayMessage", { seconds: maxDurationSec })}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4" />
                {t("cv.hub.report")}
              </CardTitle>
              <CardDescription>
                {t("cv.hub.reportDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.planned")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDurationSec(sessionReport.plannedDurationSec)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.actual")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDurationSec(sessionReport.actualDurationSec)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.totalVisits")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {sessionReport.totalVisits}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.avgStay")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDurationSec(sessionReport.averageStaySec)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.peakConcurrent")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {sessionReport.peakConcurrent}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.occupiedTime")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {formatDurationSec(sessionReport.occupiedSec)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.overstayCount")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-destructive">
                    {sessionReport.overstayCount}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    {t("cv.hub.reportMetrics.overstayPercent")}
                  </p>
                  <p className="text-2xl font-bold tabular-nums">
                    {sessionReport.overstayPercent}%
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("cv.hub.reportMetrics.averageConcurrent", {
                  count: sessionReport.averageConcurrent,
                })}
              </p>

              {sessionReport.visits.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("cv.hub.visits.object")}</TableHead>
                        <TableHead>{t("cv.hub.visits.entered")}</TableHead>
                        <TableHead>{t("cv.hub.visits.exited")}</TableHead>
                        <TableHead>{t("cv.hub.visits.duration")}</TableHead>
                        <TableHead>{t("cv.hub.visits.status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...sessionReport.visits].reverse().map((visit, i) => (
                        <TableRow key={`${visit.trackLabel}-${visit.enteredAt}-${i}`}>
                          <TableCell>{visit.trackLabel}</TableCell>
                          <TableCell className="tabular-nums">
                            {formatClockTime(visit.enteredAt)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatClockTime(visit.exitedAt)}
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {formatDurationSec(visit.durationSec)}
                          </TableCell>
                          <TableCell>
                            {visit.isOverstay ? (
                              <Badge variant="destructive">{t("cv.hub.overstay")}</Badge>
                            ) : (
                              <Badge variant="outline">
                                {t("cv.hub.visits.ok")}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("cv.hub.visits.empty")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <CardTitle className="text-sm">
                  {t("cv.hub.settings.title")}
                </CardTitle>
                {settingsOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              <CardDescription>
                {t("cv.hub.settings.description")}
              </CardDescription>
            </CardHeader>
            {settingsOpen && (
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="min-object">
                      {t("cv.hub.settings.minimumObjectSize")}
                    </Label>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {minObjectSize}%
                    </span>
                  </div>
                  <input
                    id="min-object"
                    type="range"
                    min={0}
                    max={100}
                    value={minObjectSize}
                    onChange={(e) =>
                      setMinObjectSize(Number.parseInt(e.target.value, 10))
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
