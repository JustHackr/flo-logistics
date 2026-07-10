"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_AI_PROVIDER_SETTINGS,
  type AiProviderSettingsPublic,
} from "@/lib/ai-settings";

export function AiSettingsClient() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_AI_PROVIDER_SETTINGS.baseUrl);
  const [model, setModel] = useState(DEFAULT_AI_PROVIDER_SETTINGS.model);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/ai/settings");
      const json = (await res.json()) as AiProviderSettingsPublic & {
        error?: string;
      };
      if (!res.ok) throw new Error(json.error ?? "Failed to load settings");

      setBaseUrl(json.baseUrl);
      setModel(json.model);
      setHasStoredKey(json.hasApiKey);
      setApiKeyMasked(json.apiKeyMasked ?? null);
      setApiKey("");
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setTestError(null);
    try {
      const res = await fetch("/api/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          baseUrl,
          model,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save settings");

      setHasStoredKey(json.hasApiKey);
      setApiKeyMasked(json.apiKeyMasked ?? null);
      setApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to save settings");
    }
  }

  async function handleClear() {
    setTestError(null);
    try {
      const res = await fetch("/api/ai/settings", { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to clear settings");

      setApiKey("");
      setBaseUrl(json.baseUrl ?? DEFAULT_AI_PROVIDER_SETTINGS.baseUrl);
      setModel(json.model ?? DEFAULT_AI_PROVIDER_SETTINGS.model);
      setHasStoredKey(false);
      setApiKeyMasked(null);
      setTestResult(null);
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Failed to clear settings");
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          baseUrl,
          model,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Connection test failed");
      setTestResult(json.sample ?? "Connection successful.");
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Connection test failed");
    } finally {
      setTesting(false);
    }
  }

  const canTest = Boolean(apiKey.trim() || hasStoredKey);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">AI Settings</h2>
        </div>
        <p className="mt-1 text-muted-foreground">
          Connect an OpenAI-compatible API (e.g. MiniMax). Settings apply to
          everyone using this BALON site.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider connection</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading settings…</p>
          ) : (
            <form className="space-y-4" onSubmit={handleSave}>
              {loadError && (
                <p className="text-sm text-destructive">{loadError}</p>
              )}

              <div className="space-y-2">
                <Label htmlFor="baseUrl">API base URL</Label>
                <Input
                  id="baseUrl"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.minimax.chat/v1"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  OpenAI-compatible root — requests go to{" "}
                  <code className="rounded bg-muted px-1">/chat/completions</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiKey">API key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasStoredKey ? "Leave blank to keep current key" : "sk-..."}
                  autoComplete="off"
                />
                {hasStoredKey && (
                  <p className="text-xs text-muted-foreground">
                    Stored key: {apiKeyMasked ?? "••••"} (shared site-wide in app database)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="MiniMax-Text-01"
                  autoComplete="off"
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="submit">Save settings</Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={testing || !canTest}
                  onClick={() => void handleTest()}
                >
                  {testing ? "Testing…" : "Test connection"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => void handleClear()}>
                  Clear
                </Button>
              </div>

              {saved && (
                <p className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Settings saved for all users.
                </p>
              )}
              {testResult && (
                <p className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-800 dark:text-emerald-200">
                  <strong>Connected.</strong> {testResult}
                </p>
              )}
              {testError && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                  {testError}
                </p>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistant persona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The AI is configured as a{" "}
            <strong className="text-foreground">
              supply chain operations &amp; logistics expert
            </strong>{" "}
            for BALON. It answers using live fleet, order, and route data injected
            on each request.
          </p>
          <p>
            Questions outside logistics (general trivia, coding, personal topics,
            etc.) are politely declined with suggestions to ask about routes,
            drivers, orders, or maintenance.
          </p>
          <p className="text-xs">
            The API key is stored in the app database and used server-side for all
            visitors — it is never committed to git.
          </p>
        </CardContent>
      </Card>

      <Button render={<Link href="/ai/chat" />} variant="outline">
        <Sparkles className="mr-2 h-4 w-4" />
        Open Company Assistant
      </Button>
    </div>
  );
}
