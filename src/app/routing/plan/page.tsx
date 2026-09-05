import { Suspense } from "react";
import { PlanPageClientWrapper } from "@/components/routing/plan-page-client-wrapper";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";

export default async function RoutingPlanPage() {
  const dict = await getDictionary(await getLocale());
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">{t(dict, "routing.plan.loading")}</div>}>
      <PlanPageClientWrapper />
    </Suspense>
  );
}

