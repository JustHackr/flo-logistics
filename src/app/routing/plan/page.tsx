import { Suspense } from "react";
import { PlanPageClientWrapper } from "@/components/routing/plan-page-client-wrapper";

export default function RoutingPlanPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading plan...</div>}>
      <PlanPageClientWrapper />
    </Suspense>
  );
}

