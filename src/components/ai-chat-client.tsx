"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Loader2, Send, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUGGESTED_PROMPTS } from "@/lib/ai-chat-prompts";
import {
  isAiProviderConfigured,
  loadAiProviderSettings,
  type AiProviderSettings,
} from "@/lib/ai-settings";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  links?: Array<{ label: string; href: string }>;
};

function renderMarkdownLite(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function AiChatClient() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q")?.trim() ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi — I'm your BALON supply chain & logistics operations expert. Ask about routes, drivers, orders, fleet health, fuel, or delivery KPIs.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerSettings, setProviderSettings] =
    useState<AiProviderSettings | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  useEffect(() => {
    setProviderSettings(loadAiProviderSettings());
  }, []);

  const llmConfigured = isAiProviderConfigured(providerSettings);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError(null);
      setLoading(true);
      setInput("");

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
      };

      let historyForApi: { role: "user" | "assistant"; content: string }[] = [];
      setMessages((prev) => {
        const next = [...prev, userMsg];
        historyForApi = next
          .filter((m) => m.id !== "welcome")
          .slice(-10)
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content }));
        return next;
      });

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyForApi,
            settings: llmConfigured ? providerSettings : undefined,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Request failed");

        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: json.reply,
            links: json.links,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    },
    [loading, llmConfigured, providerSettings]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (initialPrompt && !initialSent.current) {
      initialSent.current = true;
      void sendMessage(initialPrompt);
    }
  }, [initialPrompt, sendMessage]);

  return (
    <div className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-4xl flex-col md:h-[calc(100dvh-8rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background shadow-sm">
        {/* Chat header */}
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">Company Assistant</h2>
            <p className="truncate text-xs text-muted-foreground">
              {llmConfigured
                ? `Online · ${providerSettings?.model ?? "LLM"}`
                : "Built-in mode · configure API in sidebar settings"}
            </p>
          </div>
          <div
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              llmConfigured ? "bg-emerald-500" : "bg-amber-500"
            )}
            title={llmConfigured ? "API connected" : "No API configured"}
          />
        </div>

        {/* Suggested prompts */}
        <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Try asking
          </p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                disabled={loading}
                onClick={() => void sendMessage(prompt.message)}
                className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {prompt.label}
              </button>
            ))}
          </div>
          {!llmConfigured && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-500">
              Add your API key in{" "}
              <Link href="/ai/settings" className="underline underline-offset-2">
                AI Settings
              </Link>{" "}
              for richer logistics expert answers.
            </p>
          )}
        </div>

        {/* Message thread */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-muted/20 px-4 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex items-end gap-2",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {msg.role === "user" ? (
                  <User className="h-3.5 w-3.5" />
                ) : (
                  <Bot className="h-3.5 w-3.5" />
                )}
              </div>
              <div
                className={cn(
                  "max-w-[min(78%,520px)] px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                  msg.role === "user"
                    ? "rounded-2xl rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-2xl rounded-bl-md border bg-background text-foreground"
                )}
              >
                <div className="whitespace-pre-wrap">
                  {msg.role === "assistant"
                    ? renderMarkdownLite(msg.content)
                    : msg.content}
                </div>
                {msg.links && msg.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-border/40 pt-2">
                    {msg.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className="text-xs font-medium underline underline-offset-2 opacity-90 hover:opacity-100"
                      >
                        {link.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-end gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border bg-background px-3.5 py-2.5 text-sm text-muted-foreground shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {llmConfigured ? "Typing…" : "Checking live data…"}
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t bg-background px-4 py-3">
          {error && (
            <p className="mb-2 text-sm text-destructive">{error}</p>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Company Assistant…"
              rows={1}
              disabled={loading}
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border bg-muted/40 px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:bg-background disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-full"
              disabled={loading || !input.trim()}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
