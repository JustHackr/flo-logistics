"use client";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n/use-i18n";
import { DTI_THRESHOLDS } from "@/lib/routing/dti";
import type { RiskLevel } from "@/lib/vqi";

function getDtiBadgeVariant(risk: RiskLevel) {
  if (risk === "high") return "destructive" as const;
  if (risk === "medium") return "secondary" as const;
  return "default" as const;
}

export function DtiBadge({
  score,
  risk,
  pending,
}: {
  score?: number;
  risk?: RiskLevel;
  pending?: boolean;
}) {
  const { t } = useI18n();

  if (pending) {
    return <Badge variant="outline">{t("status.dtiPending")}</Badge>;
  }

  const riskLevel = risk ?? "medium";
  return (
    <Badge variant={getDtiBadgeVariant(riskLevel)}>
      {t("status.dtiWithRisk", {
        score: score ?? "—",
        risk: t(`status.risk.${riskLevel}`),
      })}
    </Badge>
  );
}

export { DTI_THRESHOLDS };
