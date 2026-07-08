import { Badge } from "@/components/ui/badge";
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
  if (pending) {
    return <Badge variant="outline">DTI pending</Badge>;
  }
  return (
    <Badge variant={getDtiBadgeVariant(risk ?? "medium")}>
      DTI {score} · {risk}
    </Badge>
  );
}

export { DTI_THRESHOLDS };
