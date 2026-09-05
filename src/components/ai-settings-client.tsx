"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AiProviderStatus } from "@/lib/ai-settings";
import { useI18n } from "@/components/i18n/use-i18n";

export function AiSettingsClient() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<AiProviderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/settings");
      const json = (await res.json()) as AiProviderStatus & { error?: string };
      if (!res.ok) throw new Error(json.error ?? t("errors.generic"));
      setStatus({ configured: json.configured, model: json.model });
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test-connection", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t("errors.network"));
      setTestResult(json.sample ?? t("ai.settings.connectionSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
    } finally {
      setTesting(false);
    }
  }

  return (
    <div lang={locale} className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">{t("ai.settings.title")}</h2>
        </div>
        <p className="mt-1 text-muted-foreground">
          {t("ai.settings.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ai.settings.providerStatus")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t("ai.settings.loadingStatus")}</p>
          ) : status?.configured ? (
            <div className="space-y-3">
              <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                {t("ai.settings.assistantReady")}
              </p>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("ai.settings.model")}</dt>
                  <dd className="font-medium tabular-nums">{status.model}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{t("ai.settings.provider")}</dt>
                  <dd className="font-medium">{t("ai.settings.serverManaged")}</dd>
                </div>
              </dl>
              <Button
                type="button"
                variant="outline"
                disabled={testing}
                onClick={() => void handleTest()}
              >
                {testing ? t("ai.settings.testing") : t("ai.settings.testConnection")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("ai.settings.notConfigured")}
            </p>
          )}

          {testResult && (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              <strong>{t("ai.settings.connected")}</strong> {testResult}
            </p>
          )}
          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ai.settings.personaTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t("ai.settings.personaDescription")}</p>
          <p>{t("ai.settings.scopeDescription")}</p>
        </CardContent>
      </Card>

      <Button render={<Link href="/ai/chat" />} variant="outline">
        <Sparkles className="mr-2 h-4 w-4" />
        {t("ai.settings.openAssistant")}
      </Button>
    </div>
  );
}
