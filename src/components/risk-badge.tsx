"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n/use-i18n";
import { getRiskBadgeVariant } from "@/lib/vqi";
import type { RiskLevel } from "@/lib/vqi";

export function RiskBadge({
  risk,
  vqi,
}: {
  risk: RiskLevel;
  vqi?: number;
}) {
  const { t } = useI18n();
  const riskLabel = t(`status.risk.${risk}`);

  return (
    <Badge variant={getRiskBadgeVariant(risk)}>
      {vqi !== undefined
        ? t("status.vqiWithRisk", { vqi, risk: riskLabel })
        : riskLabel}
    </Badge>
  );
}
