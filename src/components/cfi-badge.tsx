"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n/use-i18n";

const ENGINE_KEYS = new Set(["gasoline", "diesel", "electric", "hybrid"]);

export function CfiBadge({
  score,
  engineType,
}: {
  score: number;
  engineType?: string;
}) {
  const { t } = useI18n();
  const variant =
    score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive";

  const engineKey = engineType?.toLowerCase();
  const engineLabel =
    engineKey && ENGINE_KEYS.has(engineKey)
      ? t(`status.engineType.${engineKey}`)
      : engineType;

  return (
    <Badge variant={variant}>
      {engineLabel
        ? t("status.cfiWithEngine", { score, engine: engineLabel })
        : t("status.cfiScore", { score })}
    </Badge>
  );
}
