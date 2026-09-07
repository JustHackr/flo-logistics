"use client";

import Link from "next/link";
import {
  Database,
  Lock,
  Network,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useI18n } from "@/components/i18n/use-i18n";

const COLUMNS = [
  {
    icon: Lock,
    titleKey: "sovereign.columns.device.title",
    bodyKey: "sovereign.columns.device.body",
    itemsKey: [
      "sovereign.columns.device.item1",
      "sovereign.columns.device.item2",
      "sovereign.columns.device.item3",
    ],
  },
  {
    icon: Server,
    titleKey: "sovereign.columns.local.title",
    bodyKey: "sovereign.columns.local.body",
    itemsKey: [
      "sovereign.columns.local.item1",
      "sovereign.columns.local.item2",
      "sovereign.columns.local.item3",
    ],
  },
  {
    icon: Network,
    titleKey: "sovereign.columns.external.title",
    bodyKey: "sovereign.columns.external.body",
    itemsKey: [
      "sovereign.columns.external.item1",
      "sovereign.columns.external.item2",
      "sovereign.columns.external.item3",
    ],
  },
] as const;

export function SovereignAiClient() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="space-y-3">
        <Badge variant="outline" className="border-primary/30 text-primary">
          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
          {t("sovereign.badge")}
        </Badge>
        <h2 className="text-3xl font-semibold tracking-tight">
          {t("sovereign.title")}
        </h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {t("sovereign.subtitle")}
        </p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button size="sm" render={<Link href="/ai/chat" />}>
            <Sparkles className="mr-2 h-4 w-4" />
            {t("sovereign.cta.assistant")}
          </Button>
          <Button size="sm" variant="outline" render={<Link href="/computer-vision/tour" />}>
            {t("sovereign.cta.cvTour")}
          </Button>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => (
          <Card key={col.titleKey} className="h-full">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <col.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-base">{t(col.titleKey)}</CardTitle>
              <CardDescription>{t(col.bodyKey)}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {col.itemsKey.map((key) => (
                  <li key={key} className="flex gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            {t("sovereign.flow.title")}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t("sovereign.flow.description")}
          </p>
        </div>
        <Card>
          <CardContent className="space-y-4 pt-6 font-mono text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-4 text-foreground">
{`Browser (UI only)
  │  no analytics · no third-party trackers
  ▼
Next.js server (this deployment)
  ├─ SQLite (orders, fleet, routes)     ← data residency
  ├─ Local ops assistant (intent router)← default / sovereign
  ├─ Route optimizer + Jakarta traffic  ← in-process
  └─ CV inference (browser MediaStream) ← on-device
  │
  └─ Optional external (opt-in only)
       ├─ Google Maps / Routes API     ← GOOGLE_MAPS_API_KEY
       ├─ Pertamina fuel list fetch    ← public price page
       └─ OpenAI-compatible LLM        ← AI_ALLOW_EXTERNAL=true`}
            </pre>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-4 w-4 text-primary" />
              {t("sovereign.residency.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>{t("sovereign.residency.body")}</p>
            <p>{t("sovereign.residency.cookies")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-4 w-4 text-primary" />
              {t("sovereign.commitments.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("sovereign.commitments.item1")}</li>
              <li>{t("sovereign.commitments.item2")}</li>
              <li>{t("sovereign.commitments.item3")}</li>
              <li>{t("sovereign.commitments.item4")}</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <p className="text-xs text-muted-foreground">
        {t("sovereign.docsHint")}{" "}
        <Link href="/methodology" className="font-medium underline">
          {t("sovereign.methodologyLink")}
        </Link>
        {" · "}
        <span className="font-medium">{t("sovereign.securityFile")}</span>
      </p>
    </div>
  );
}
