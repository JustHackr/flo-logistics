"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/use-i18n";
import {
  SESSION_DURATION_PRESETS_SEC,
  formatSessionPresetLabel,
} from "@/lib/computer-vision/session-timer";

type SessionDurationControlsProps = {
  valueSec: number;
  onChange: (sec: number) => void;
  disabled?: boolean;
  id?: string;
};

export function SessionDurationControls({
  valueSec,
  onChange,
  disabled = false,
  id = "session-duration",
}: SessionDurationControlsProps) {
  const { t, locale } = useI18n();

  function presetLabel(seconds: number) {
    if (seconds < 60) return t("cv.controls.secondsShort", { count: seconds });
    return t("cv.controls.minutesShort", { count: seconds / 60 });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={id}>{t("cv.controls.sessionDurationSeconds")}</Label>
        <Input
          id={id}
          type="number"
          min={10}
          max={3600}
          value={valueSec}
          disabled={disabled}
          onChange={(e) => {
            const next = Number.parseInt(e.target.value, 10);
            if (Number.isFinite(next)) onChange(next);
          }}
        />
        <p className="text-xs text-muted-foreground">
          {t("cv.controls.sessionDurationHint")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {SESSION_DURATION_PRESETS_SEC.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={disabled}
            onClick={() => onChange(preset)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs transition-colors",
              valueSec === preset
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {locale === "en" ? formatSessionPresetLabel(preset) : presetLabel(preset)}
          </button>
        ))}
      </div>
    </div>
  );
}
