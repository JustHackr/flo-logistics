"use client";

import { withBasePath } from "@/lib/base-path";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OLLAMA_MODEL,
  type AiProviderMode,
  type AiProviderStatus,
} from "@/lib/ai-settings";
import { useI18n } from "@/components/i18n/use-i18n";
import { cn } from "@/lib/utils";

type FormState = {
  mode: AiProviderMode;
  baseUrl: string;
  model: string;
  apiKey: string;
};

const emptyForm = (): FormState => ({
  mode: "sovereign",
  baseUrl: DEFAULT_OLLAMA_BASE_URL,
  model: DEFAULT_OLLAMA_MODEL,
  apiKey: "",
});

function formFromStatus(status: AiProviderStatus): FormState {
  if (status.mode === "ollama") {
    return {
      mode: "ollama",
      baseUrl: status.baseUrl ?? DEFAULT_OLLAMA_BASE_URL,
      model: status.model || DEFAULT_OLLAMA_MODEL,
      apiKey: "",
    };
  }
  if (status.mode === "openai_compatible") {
    return {
      mode: "openai_compatible",
      baseUrl: status.baseUrl ?? "",
      model: status.model,
      apiKey: "",
    };
  }
  return emptyForm();
}

function modeLabelKey(mode: AiProviderMode): string {
  switch (mode) {
    case "ollama":
      return "ai.settings.modeOllama";
    case "openai_compatible":
      return "ai.settings.modeOpenAiCompatible";
    default:
      return "ai.settings.modeSovereign";
  }
}

export function AiSettingsClient() {
  const { t, locale } = useI18n();
  const [status, setStatus] = useState<
    (AiProviderStatus & { canEdit?: boolean }) | null
  >(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(withBasePath("/api/ai/settings"));
      const json = (await res.json()) as AiProviderStatus & {
        error?: string;
        canEdit?: boolean;
      };
      if (!res.ok) throw new Error(json.error ?? t("errors.generic"));
      setStatus(json);
      setForm(formFromStatus(json));
      setIsAdmin(Boolean(json.canEdit));
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

  function updateMode(mode: AiProviderMode) {
    setForm((prev) => {
      if (mode === "ollama") {
        return {
          mode,
          baseUrl: prev.mode === "ollama" ? prev.baseUrl : DEFAULT_OLLAMA_BASE_URL,
          model: prev.mode === "ollama" ? prev.model : DEFAULT_OLLAMA_MODEL,
          apiKey: "",
        };
      }
      if (mode === "openai_compatible") {
        return {
          mode,
          baseUrl: prev.mode === "openai_compatible" ? prev.baseUrl : "",
          model: prev.mode === "openai_compatible" ? prev.model : "",
          apiKey: "",
        };
      }
      return { ...emptyForm(), mode: "sovereign" };
    });
    setTestResult(null);
    setSaveResult(null);
    setError(null);
  }

  function buildPayload() {
    if (form.mode === "sovereign") {
      return { mode: "sovereign" as const };
    }
    if (form.mode === "ollama") {
      return {
        mode: "ollama" as const,
        baseUrl: form.baseUrl.trim() || DEFAULT_OLLAMA_BASE_URL,
        model: form.model.trim() || DEFAULT_OLLAMA_MODEL,
      };
    }
    return {
      mode: "openai_compatible" as const,
      baseUrl: form.baseUrl.trim(),
      model: form.model.trim(),
      apiKey: form.apiKey.trim() || undefined,
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaveResult(null);
    setTestResult(null);
    try {
      const res = await fetch(withBasePath("/api/ai/settings"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t("errors.generic"));
      setStatus(json as AiProviderStatus);
      setForm(formFromStatus(json as AiProviderStatus));
      setSaveResult(t("ai.settings.saved"));
      setIsAdmin(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setError(null);
    setTestResult(null);
    try {
      const res = await fetch(withBasePath("/api/ai/test-connection"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t("errors.network"));
      setTestResult(json.sample ?? t("ai.settings.connectionSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.network"));
    } finally {
      setTesting(false);
    }
  }

  const showProviderFields =
    form.mode === "ollama" || form.mode === "openai_compatible";

  return (
    <div lang={locale} className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">
            {t("ai.settings.title")}
          </h2>
        </div>
        <p className="mt-1 text-muted-foreground">
          {t("ai.settings.description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("ai.settings.providerStatus")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">
              {t("ai.settings.loadingStatus")}
            </p>
          ) : (
            <div className="space-y-3">
              {status?.configured ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4" />
                  {t("ai.settings.assistantReady")}
                </p>
              ) : (
                <p className="font-medium text-foreground">
                  {t("ai.settings.sovereignActive")}
                </p>
              )}
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("ai.settings.mode")}
                  </dt>
                  <dd className="font-medium">
                    {t(modeLabelKey(status?.mode ?? "sovereign"))}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("ai.settings.model")}
                  </dt>
                  <dd className="font-medium tabular-nums">
                    {status?.model ?? "—"}
                  </dd>
                </div>
                {status?.baseUrlHost ? (
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">
                      {t("ai.settings.endpoint")}
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {status.baseUrlHost}
                    </dd>
                  </div>
                ) : null}
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {t("ai.settings.source")}
                  </dt>
                  <dd className="font-medium">
                    {status?.source === "sqlite"
                      ? t("ai.settings.sourceSqlite")
                      : status?.source === "env"
                        ? t("ai.settings.sourceEnv")
                        : t("ai.settings.sourceDefault")}
                  </dd>
                </div>
              </dl>
              <p>
                <Link href="/sovereign-ai" className="text-sm font-medium underline">
                  {t("ai.settings.learnSovereign")}
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("ai.settings.configureTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("ai.settings.configureHint")}
          </p>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">
              {t("ai.settings.chooseMode")}
            </legend>
            {(
              [
                "sovereign",
                "ollama",
                "openai_compatible",
              ] as const
            ).map((mode) => (
              <label
                key={mode}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors",
                  form.mode === mode
                    ? "border-primary/40 bg-primary/5"
                    : "hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="ai-mode"
                  className="mt-1"
                  checked={form.mode === mode}
                  onChange={() => updateMode(mode)}
                  disabled={loading}
                />
                <span>
                  <span className="font-medium">{t(modeLabelKey(mode))}</span>
                  <span className="mt-0.5 block text-muted-foreground">
                    {t(
                      mode === "sovereign"
                        ? "ai.settings.modeSovereignHint"
                        : mode === "ollama"
                          ? "ai.settings.modeOllamaHint"
                          : "ai.settings.modeOpenAiCompatibleHint"
                    )}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {showProviderFields ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="ai-base-url">
                  {t("ai.settings.baseUrl")}
                </label>
                <Input
                  id="ai-base-url"
                  value={form.baseUrl}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, baseUrl: e.target.value }))
                  }
                  placeholder={
                    form.mode === "ollama"
                      ? DEFAULT_OLLAMA_BASE_URL
                      : "https://api.example.com/v1"
                  }
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="ai-model">
                  {t("ai.settings.model")}
                </label>
                <Input
                  id="ai-model"
                  value={form.model}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, model: e.target.value }))
                  }
                  placeholder={
                    form.mode === "ollama" ? DEFAULT_OLLAMA_MODEL : "gpt-4o-mini"
                  }
                  autoComplete="off"
                />
              </div>
              {form.mode === "openai_compatible" ? (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="ai-api-key">
                    {t("ai.settings.apiKey")}
                  </label>
                  <Input
                    id="ai-api-key"
                    type="password"
                    value={form.apiKey}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, apiKey: e.target.value }))
                    }
                    placeholder={
                      status?.hasApiKey
                        ? t("ai.settings.apiKeyUnchanged")
                        : t("ai.settings.apiKeyPlaceholder")
                    }
                    autoComplete="off"
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {showProviderFields ? (
              <Button
                type="button"
                variant="outline"
                disabled={testing || loading || !isAdmin}
                onClick={() => void handleTest()}
              >
                {testing
                  ? t("ai.settings.testing")
                  : t("ai.settings.testConnection")}
              </Button>
            ) : null}
            <Button
              type="button"
              disabled={saving || loading || !isAdmin}
              onClick={() => void handleSave()}
            >
              {saving ? t("ai.settings.saving") : t("ai.settings.save")}
            </Button>
          </div>

          {!isAdmin && !loading ? (
            <p className="text-xs text-muted-foreground">
              {t("ai.settings.adminOnlySave")}
            </p>
          ) : null}

          {saveResult ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              {saveResult}
            </p>
          ) : null}
          {testResult ? (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
              <strong>{t("ai.settings.connected")}</strong> {testResult}
            </p>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("ai.settings.personaTitle")}
          </CardTitle>
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
