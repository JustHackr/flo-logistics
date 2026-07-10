"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_AI_PROVIDER_SETTINGS,
  loadAiProviderSettings,
  maskApiKey,
  saveAiProviderSettings,
  clearAiProviderSettings,
  type AiProviderSettings,
} from "@/lib/ai-settings";

export function AiSettingsClient() {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(DEFAULT_AI_PROVIDER_SETTINGS.baseUrl);
  const [model, setModel] = useState(DEFAULT_AI_PROVIDER_SETTINGS.model);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(false);

  useEffect(() => {
    const stored = loadAiProviderSettings();
    if (stored) {
      setBaseUrl(stored.baseUrl);
      setModel(stored.model);
      setApiKey(stored.apiKey);
      setHasStoredKey(true);
    }
  }, []);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const settings: AiProviderSettings = { apiKey, baseUrl, model };
    saveAiProviderSettings(settings);
    setHasStoredKey(true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleClear() {
    clearAiProviderSettings();
    setApiKey("");
    setBaseUrl(DEFAULT_AI_PROVIDER_SETTINGS.baseUrl);
    setModel(DEFAULT_AI_PROVIDER_SETTINGS.model);
    setHasStoredKey(false);
    setTestResult(null);
    setTestError(null);
  }

  async function handleTest() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl, model }),
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

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-tight">AI Settings</h2>
        </div>
        <p className="mt-1 text-muted-foreground">
          Connect an OpenAI-compatible API (e.g. MiniMax). The assistant acts as a
          supply chain &amp; logistics operations expert and stays on-topic.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider connection</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSave}>
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
                placeholder="sk-..."
                autoComplete="off"
              />
              {hasStoredKey && apiKey && (
                <p className="text-xs text-muted-foreground">
                  Stored key: {maskApiKey(apiKey)} (saved in this browser only)
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
                disabled={testing || !apiKey.trim()}
                onClick={() => void handleTest()}
              >
                {testing ? "Testing…" : "Test connection"}
              </Button>
              <Button type="button" variant="ghost" onClick={handleClear}>
                Clear
              </Button>
            </div>

            {saved && (
              <p className="flex items-center gap-1 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                Settings saved locally.
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assistant persona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            The AI is configured as a <strong className="text-foreground">supply chain operations &amp; logistics expert</strong> for
            BALON. It answers using live fleet, order, and route data injected on each request.
          </p>
          <p>
            Questions outside logistics (general trivia, coding, personal topics, etc.) are
            politely declined with suggestions to ask about routes, drivers, orders, or maintenance.
          </p>
          <p className="text-xs">
            Your API key is stored in browser localStorage and sent only to this app&apos;s server
            to proxy chat requests — it is not committed to git.
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
