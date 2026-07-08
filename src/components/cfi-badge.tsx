import { Badge } from "@/components/ui/badge";

export function CfiBadge({
  score,
  engineType,
}: {
  score: number;
  engineType?: string;
}) {
  const variant =
    score >= 70 ? "default" : score >= 40 ? "secondary" : "destructive";
  return (
    <Badge variant={variant}>
      CFI {score}
      {engineType ? ` · ${engineType}` : ""}
    </Badge>
  );
}
