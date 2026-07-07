import { Badge } from "@/components/ui/badge";
import { getRiskBadgeVariant } from "@/lib/vqi";
import type { RiskLevel } from "@/lib/vqi";

export function RiskBadge({
  risk,
  vqi,
}: {
  risk: RiskLevel;
  vqi?: number;
}) {
  return (
    <Badge variant={getRiskBadgeVariant(risk)} className="capitalize">
      {vqi !== undefined ? `VQI ${vqi} · ` : ""}
      {risk}
    </Badge>
  );
}
