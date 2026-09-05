"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { VideoInputDevice } from "@/lib/computer-vision/camera-devices";
import { useI18n } from "@/components/i18n/use-i18n";

type CameraSourceSelectProps = {
  devices: VideoInputDevice[];
  value: string;
  onValueChange: (deviceId: string) => void;
  disabled?: boolean;
};

export function CameraSourceSelect({
  devices,
  value,
  onValueChange,
  disabled = false,
}: CameraSourceSelectProps) {
  const { t } = useI18n();
  if (devices.length <= 1) return null;

  return (
    <div className="flex min-w-[200px] flex-1 flex-col gap-1.5 sm:max-w-xs">
      <Label htmlFor="camera-source" className="text-xs">
        {t("cv.controls.cameraSource")}
      </Label>
      <Select
        value={value}
        onValueChange={(next) => {
          if (next) onValueChange(next);
        }}
        disabled={disabled}
      >
        <SelectTrigger id="camera-source" className="w-full">
          <SelectValue placeholder={t("cv.controls.selectCamera")} />
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
