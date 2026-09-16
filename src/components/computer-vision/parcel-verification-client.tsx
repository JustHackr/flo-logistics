"use client";
/* eslint-disable @next/next/no-img-element -- barcode fixtures must remain pixel-exact for native scanning. */

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, Barcode, Camera, CameraOff, CheckCircle2, ExternalLink, FileImage, PackageCheck, RefreshCw, ScanBarcode, ShieldCheck, TriangleAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CameraSourceSelect } from "@/components/computer-vision/camera-source-select";
import { attachStreamToVideo, openCameraStream, stopMediaStream } from "@/lib/computer-vision/camera-stream";
import { BARCODE_FIXTURES, type BarcodeFixture, type BarcodeVerification } from "@/lib/computer-vision/barcode-verification";
import { listVideoInputDevices, type VideoInputDevice } from "@/lib/computer-vision/camera-devices";
import { withBasePath } from "@/lib/base-path";
import { useI18n } from "@/components/i18n/use-i18n";

type DetectorResult = { rawValue?: string; boundingBox?: DOMRectReadOnly };
type Detector = { detect(source: CanvasImageSource): Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
type CameraState = "idle" | "active" | "error";

function barcodeDetectorConstructor() {
  return (globalThis as typeof globalThis & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
}

function outcomeVariant(outcome: BarcodeVerification["outcome"]) {
  return outcome === "VERIFIED" ? "default" as const : outcome === "EXCEPTION" ? "destructive" as const : "secondary" as const;
}

function outcomeIcon(outcome: BarcodeVerification["outcome"]) {
  return outcome === "VERIFIED" ? <CheckCircle2 className="h-5 w-5" /> : outcome === "EXCEPTION" ? <XCircle className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />;
}

function formatOutcome(outcome: BarcodeVerification["outcome"]) {
  return outcome === "VERIFIED" ? "VERIFIED" : outcome === "EXCEPTION" ? "EXCEPTION" : "REVIEW";
}

export function ParcelVerificationClient() {
  const { locale, t } = useI18n();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const detectorRef = React.useRef<Detector | null>(null);
  const scanTimerRef = React.useRef<number | null>(null);
  const scanBusyRef = React.useRef(false);
  const [selectedFixtureId, setSelectedFixtureId] = React.useState(BARCODE_FIXTURES[0].id);
  const [manualCode, setManualCode] = React.useState(BARCODE_FIXTURES[0].code);
  const [cameraState, setCameraState] = React.useState<CameraState>("idle");
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [devices, setDevices] = React.useState<VideoInputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = React.useState("");
  const [detectorSupported, setDetectorSupported] = React.useState<boolean | null>(null);
  const [result, setResult] = React.useState<BarcodeVerification & { order?: { status: string; fulfillmentStatus: string; routePlanId: string | null; driverName: string | null; stopSequence: number | null } } | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [exceptionCreated, setExceptionCreated] = React.useState(false);
  const [uploadedName, setUploadedName] = React.useState<string | null>(null);

  const selectedFixture = BARCODE_FIXTURES.find((fixture) => fixture.id === selectedFixtureId) ?? BARCODE_FIXTURES[0];

  React.useEffect(() => {
    const timer = window.setTimeout(() => void listVideoInputDevices().then(setDevices), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const stopCamera = React.useCallback(() => {
    if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
    scanTimerRef.current = null;
    stopMediaStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    scanBusyRef.current = false;
    setCameraState("idle");
  }, []);

  React.useEffect(() => () => stopCamera(), [stopCamera]);

  async function verify(code: string, mode: "fixture" | "live", fixture?: BarcodeFixture) {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    setLoading(true); setExceptionCreated(false); setCameraError(null);
    try {
      const query = new URLSearchParams({ code: normalized, mode });
      if (fixture) query.set("fixtureId", fixture.id);
      const response = await fetch(withBasePath(`/api/computer-vision/barcode/verify?${query.toString()}`), { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "Barcode verification failed");
      setResult(body);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : "Barcode verification failed");
    } finally { setLoading(false); }
  }

  async function startCamera() {
    setCameraError(null);
    const Constructor = barcodeDetectorConstructor();
    setDetectorSupported(Boolean(Constructor));
    if (!Constructor) {
      setCameraError("This browser does not expose BarcodeDetector. Use a generated fixture or type the code manually.");
      return;
    }
    try {
      detectorRef.current = new Constructor({ formats: ["code_128", "ean_13", "ean_8", "qr_code"] });
      const stream = await openCameraStream({ deviceId: selectedDeviceId || undefined, width: 960, height: 720 });
      streamRef.current = stream;
      if (!videoRef.current) throw new Error("Camera preview is unavailable");
      await attachStreamToVideo(videoRef.current, stream);
      setCameraState("active");
      const scanFrame = async () => {
        if (!videoRef.current || !detectorRef.current || !streamRef.current) return;
        if (!scanBusyRef.current) {
          scanBusyRef.current = true;
          try {
            const detections = await detectorRef.current.detect(videoRef.current);
            const value = detections.find((item) => item.rawValue?.trim())?.rawValue;
            if (value) {
              stopCamera();
              await verify(value, "live");
              return;
            }
          } catch { /* Keep scanning; motion and glare can make a frame undecodable. */ }
          scanBusyRef.current = false;
        }
        scanTimerRef.current = window.setTimeout(() => void scanFrame(), 220);
      };
      void scanFrame();
    } catch (error) {
      stopCamera(); setCameraState("error"); setCameraError(error instanceof Error ? error.message : "Unable to open camera");
    }
  }

  async function scanUploadedImage(file: File) {
    const Constructor = barcodeDetectorConstructor();
    setUploadedName(file.name); setCameraError(null); setDetectorSupported(Boolean(Constructor));
    if (!Constructor) { setCameraError("This browser cannot decode image files natively. Use a generated fixture or type the code manually."); return; }
    setLoading(true);
    try {
      const image = new Image();
      image.src = URL.createObjectURL(file);
      await image.decode();
      const detections = await new Constructor({ formats: ["code_128", "ean_13", "ean_8", "qr_code"] }).detect(image);
      const value = detections.find((item) => item.rawValue?.trim())?.rawValue;
      if (!value) throw new Error("No barcode was detected in that image. Try a closer, brighter image.");
      await verify(value, "live");
      URL.revokeObjectURL(image.src);
    } catch (error) { setCameraError(error instanceof Error ? error.message : "Unable to scan image"); }
    finally { setLoading(false); }
  }

  async function createException() {
    if (!result || result.outcome === "VERIFIED") return;
    const response = await fetch(withBasePath("/api/computer-vision/barcode/exceptions"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: result.code, outcome: result.outcome, reason: result.message }) });
    if (response.ok) setExceptionCreated(true);
    else setCameraError("The Control Tower exception could not be created.");
  }

  function selectFixture(fixture: BarcodeFixture) {
    setSelectedFixtureId(fixture.id); setManualCode(fixture.code); setResult(null); setExceptionCreated(false); setCameraError(null);
  }

  return (
    <div lang={locale} className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5"><div className="flex items-center gap-2"><ScanBarcode className="h-5 w-5 text-primary" /><h2 className="text-2xl font-semibold tracking-tight">{t("cv.parcel.title")}</h2><Badge variant="outline">{t("cv.parcel.onDevice")}</Badge><Badge variant="secondary">{t("cv.parcel.testerDemo")}</Badge></div><p className="max-w-3xl text-sm text-muted-foreground">{t("cv.parcel.subtitle")}</p></div>
        <Button variant="outline" render={<Link href="/connectors" />}><ExternalLink className="mr-2 h-4 w-4" />Open OMS/WMS connectors</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3"><Card className="md:col-span-2"><CardHeader><CardTitle className="text-base">{t("cv.parcel.howTitle")}</CardTitle><CardDescription>{t("cv.parcel.howDescription")}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg border p-3"><Badge variant="outline">{t("cv.parcel.choose")}</Badge><p className="mt-2 text-sm">{t("cv.parcel.chooseBody")}</p></div><div className="rounded-lg border p-3"><Badge variant="outline">{t("cv.parcel.scan")}</Badge><p className="mt-2 text-sm">{t("cv.parcel.scanBody")}</p></div><div className="rounded-lg border p-3"><Badge variant="outline">{t("cv.parcel.act")}</Badge><p className="mt-2 text-sm">{t("cv.parcel.actBody")}</p></div></CardContent></Card><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4 text-primary" />{t("cv.parcel.privacyTitle")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>{t("cv.parcel.privacyBody1")}</p><p>{t("cv.parcel.privacyBody2")}</p><Badge variant="outline">No cloud vision model</Badge></CardContent></Card></div>

      <Card><CardHeader><div className="flex items-center gap-2"><FileImage className="h-4 w-4 text-primary" /><CardTitle className="text-base">{t("cv.parcel.fixtureGuide")}</CardTitle><Badge variant="outline">{t("cv.parcel.synthetic")}</Badge></div><CardDescription>{t("cv.parcel.fixtureGuideDescription")}</CardDescription></CardHeader><CardContent><div className="overflow-hidden rounded-xl border bg-muted/20"><img src={withBasePath("/cv/parcel-verification-fixtures.png")} alt="Generated parcel verification visual guide" className="h-auto w-full object-cover" /></div></CardContent></Card>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]"><Card><CardHeader><CardTitle className="text-base">Generated barcode fixtures</CardTitle><CardDescription>{BARCODE_FIXTURES.length} test labels cover verified, review, unknown, duplicate, and damaged-package paths.</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{BARCODE_FIXTURES.map((fixture) => <div key={fixture.id} className={`rounded-xl border p-3 ${fixture.id === selectedFixture.id ? "border-primary ring-1 ring-primary/30" : ""}`}><div className="mb-2 flex items-start justify-between gap-2"><div><p className="font-medium">{fixture.title}</p><p className="text-xs text-muted-foreground">{fixture.description}</p></div><Badge variant={fixture.kind === "verified" ? "outline" : fixture.kind === "unknown" ? "destructive" : "secondary"}>{fixture.kind.replaceAll("_", " ")}</Badge></div><div className="rounded-md border bg-white p-2"><img src={withBasePath(fixture.assetPath)} alt={`Barcode ${fixture.code}`} className="h-auto w-full" /></div><div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>Lane: {fixture.expectedLane}</span><span>{fixture.packageCondition}</span></div><Button size="sm" className="mt-3 w-full" variant={fixture.id === selectedFixture.id ? "default" : "outline"} onClick={() => { selectFixture(fixture); void verify(fixture.code, "fixture", fixture); }}><Barcode className="mr-2 h-4 w-4" />Test this label</Button></div>)}</CardContent></Card>

        <div className="space-y-4"><Card><CardHeader><CardTitle className="text-base">Webcam or image scan</CardTitle><CardDescription>Best in Chrome or Edge on localhost/HTTPS. Allow camera access, then hold a label inside the frame.</CardDescription></CardHeader><CardContent className="space-y-3"><div className="relative overflow-hidden rounded-lg border bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /><div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-dashed border-white/80" />{cameraState !== "active" && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white/80"><Camera className="mr-2 h-4 w-4" />{cameraState === "error" ? "Camera unavailable" : "Camera preview"}</div>}</div><CameraSourceSelect devices={devices} value={selectedDeviceId} onValueChange={setSelectedDeviceId} disabled={cameraState === "active"} /><div className="flex flex-wrap gap-2">{cameraState === "active" ? <Button variant="outline" onClick={stopCamera}><CameraOff className="mr-2 h-4 w-4" />Stop scanning</Button> : <Button onClick={() => void startCamera()}><Camera className="mr-2 h-4 w-4" />Start webcam scan</Button>}<label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"><FileImage className="mr-2 h-4 w-4" />Upload label<input className="hidden" type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) void scanUploadedImage(file); event.currentTarget.value = ""; }} /></label></div>{uploadedName && <p className="text-xs text-muted-foreground">Uploaded: {uploadedName}</p>}{detectorSupported === false && <p className="text-xs text-amber-700">Native detection is unavailable; use a fixture or manual verification.</p>}</CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Manual verification fallback</CardTitle><CardDescription>Useful for Safari, older browsers, or a presentation without camera permission.</CardDescription></CardHeader><CardContent className="space-y-3"><Label htmlFor="barcode-code">Barcode value</Label><Input id="barcode-code" value={manualCode} onChange={(event) => setManualCode(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === "Enter") void verify(manualCode, "live"); }} /><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => void verify(manualCode, "fixture", selectedFixture)}>Verify synthetic</Button><Button onClick={() => void verify(manualCode, "live")} disabled={loading}>{loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}Check OMS/WMS</Button></div>{cameraError && <p className="flex items-start gap-2 text-sm text-destructive"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />{cameraError}</p>}</CardContent></Card></div>
      </div>

      {result && <Card className={result.outcome === "VERIFIED" ? "border-emerald-500/40" : "border-amber-500/40"}><CardHeader><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2">{outcomeIcon(result.outcome)}<CardTitle className="text-base">Verification result</CardTitle><Badge variant={outcomeVariant(result.outcome)}>{formatOutcome(result.outcome)}</Badge><Badge variant="outline">{result.source}</Badge></div><span className="font-mono text-sm">{result.code}</span></div></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Decision</p><p className="mt-1 font-medium">{result.message}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Next action</p><p className="mt-1 font-medium">{result.nextAction}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">OMS/WMS record</p><p className="mt-1 font-medium">{result.order ? `${result.order.fulfillmentStatus} · ${result.order.routePlanId ? `Route stop ${result.order.stopSequence ?? "—"}` : "Unassigned"}` : "Synthetic fixture / not found"}</p></div></div>{result.fixture && <p className="text-sm text-muted-foreground">Expected dispatch lane: <span className="font-medium text-foreground">{result.fixture.expectedLane}</span> · Package condition: <span className="font-medium text-foreground">{result.fixture.packageCondition}</span></p>}{result.outcome !== "VERIFIED" && <div className="flex flex-wrap gap-2"><Button variant="destructive" onClick={() => void createException()} disabled={exceptionCreated}>{exceptionCreated ? <><CheckCircle2 className="mr-2 h-4 w-4" />Exception created</> : <><TriangleAlert className="mr-2 h-4 w-4" />Send to Control Tower</>}</Button><Button variant="outline" render={<Link href="/control-tower" />}><ExternalLink className="mr-2 h-4 w-4" />Open Control Tower</Button></div>}</CardContent></Card>}
    </div>
  );
}
