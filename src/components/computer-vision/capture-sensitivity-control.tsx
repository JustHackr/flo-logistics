"use client";

import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n/use-i18n";

type CaptureSensitivityControlProps = {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  label?: string;
  hint?: string;
};

export function CaptureSensitivityControl({
  value,
  onChange,
  id = "capture-sensitivity",
  label,
  hint,
}: CaptureSensitivityControlProps) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>{label ?? t("cv.controls.captureSensitivity")}</Label>
        <span className="text-sm font-medium tabular-nums">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number.parseInt(e.target.value, 10))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{t("cv.controls.lessSensitive")}</span>
        <span>{t("cv.controls.moreSensitive")}</span>
      </div>
      <p className="text-xs text-muted-foreground">
        {hint ?? t("cv.controls.captureSensitivityHint")}
      </p>
    </div>
  );
}
