export type OpenCameraOptions = {
  deviceId?: string;
  width?: number;
  height?: number;
};

function buildConstraints(deviceId: string | undefined, width: number, height: number): MediaStreamConstraints {
  const video: MediaTrackConstraints = {
    width: { ideal: width },
    height: { ideal: height },
  };
  if (deviceId) {
    video.deviceId = { exact: deviceId };
  } else {
    video.facingMode = { ideal: "environment" };
  }
  return { video, audio: false };
}

/** Stop every track on a stream. */
export function stopMediaStream(stream: MediaStream | null | undefined) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

/** Wait until the video element has real dimensions and can render frames. */
export function waitForVideoReady(
  video: HTMLVideoElement,
  timeoutMs = 4000
): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error("Camera stream timed out before becoming ready"));
    }, timeoutMs);

    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("playing", onReady);
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("playing", onReady);
    onReady();
  });
}

/**
 * Open a camera stream with fallback if exact deviceId fails
 * (common after permissions / device list refresh).
 */
export async function openCameraStream(
  options: OpenCameraOptions = {}
): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("Camera API is not available in this browser");
  }

  const width = options.width ?? 640;
  const height = options.height ?? 480;
  const deviceId = options.deviceId?.trim() || undefined;

  try {
    return await navigator.mediaDevices.getUserMedia(
      buildConstraints(deviceId, width, height)
    );
  } catch (err) {
    if (!deviceId) throw err;
    // Retry without pinning device (labels/ids can go stale).
    return navigator.mediaDevices.getUserMedia(buildConstraints(undefined, width, height));
  }
}

/** Attach stream to a video element, play it, and wait until frames are ready. */
export async function attachStreamToVideo(
  video: HTMLVideoElement,
  stream: MediaStream
): Promise<void> {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
  } catch {
    // Autoplay may reject if not muted in some browsers; muted is set above.
    await video.play().catch(() => undefined);
  }
  await waitForVideoReady(video);
}

export function clearCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
