"use client";

import { Construction } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from "@/components/i18n/use-i18n";

export function ComingSoonPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  const { t } = useI18n();

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <Construction className="h-7 w-7 text-muted-foreground" />
      </div>
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      <Card className="w-full">
        <CardContent className="py-6 text-sm text-muted-foreground">
          {t("common.comingSoon")}
        </CardContent>
      </Card>
    </div>
  );
}
