"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PlanPreviewClient } from "./plan-preview-client";

export function PlanPageClientWrapper() {
  const searchParams = useSearchParams();

  const orderIds = useMemo(() => {
    const raw = searchParams.get("orderIds");
    if (!raw) return [];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [searchParams]);

  return <PlanPreviewClient orderIds={orderIds} />;
}

