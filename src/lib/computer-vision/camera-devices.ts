export type VideoInputDevice = {
  deviceId: string;
  label: string;
};

export async function listVideoInputDevices(): Promise<VideoInputDevice[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  const devices = await navigator.mediaDevices.enumerateDevices();
  return devices
    .filter((device) => device.kind === "videoinput")
    .map((device, index) => ({
      deviceId: device.deviceId,
      label: device.label.trim() || `Camera ${index + 1}`,
    }));
}

export function videoConstraintsForDevice(
  deviceId: string | undefined
): MediaTrackConstraints {
  if (deviceId) {
    return {
      deviceId: { exact: deviceId },
      width: { ideal: 640 },
      height: { ideal: 480 },
    };
  }
  return {
    facingMode: "environment",
    width: { ideal: 640 },
    height: { ideal: 480 },
  };
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(Math.min(1, Math.max(0, confidence)) * 100)}%`;
}

export function averageConfidence(boxes: { confidence: number }[]): number {
  if (boxes.length === 0) return 0;
  const sum = boxes.reduce((total, box) => total + box.confidence, 0);
  return sum / boxes.length;
}
