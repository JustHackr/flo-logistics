"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Bot, Loader2, Send, Sparkles, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUGGESTED_PROMPTS } from "@/lib/ai-chat-prompts";
import {
  clearChatHistory,
  defaultChatMessages,
  loadChatHistory,
  saveChatHistory,
  type ChatMessage,
} from "@/lib/ai-chat-history";
import {
  isAiProviderPublicConfigured,
  type AiProviderStatus,
} from "@/lib/ai-settings";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n/use-i18n";

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
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("q")?.trim() ?? "";

  const [messages, setMessages] = useState<ChatMessage[]>(defaultChatMessages);
  const [historyReady, setHistoryReady] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [providerStatus, setProviderStatus] =
    useState<AiProviderStatus | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const initialSent = useRef(false);

  useEffect(() => {
    setMessages(loadChatHistory());
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    saveChatHistory(messages);
  }, [messages, historyReady]);

  useEffect(() => {
    if (!historyReady || !threadRef.current) return;
    threadRef.current.scrollTop = 0;
  }, [historyReady]);

  useEffect(() => {
    void fetch("/api/ai/settings")
      .then((res) => res.json())
      .then((json: AiProviderStatus) => setProviderStatus(json))
      .catch(() => setProviderStatus(null));
  }, []);

  const llmConfigured = isAiProviderPublicConfigured(providerStatus);

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
            locale,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? t("errors.generic"));

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
        setError(e instanceof Error ? e.message : t("errors.generic"));
      } finally {
        setLoading(false);
      }
    },
    [loading, locale, t]
  );

  function handleClearHistory() {
    clearChatHistory();
    setMessages(defaultChatMessages());
    setError(null);
    if (threadRef.current) {
      threadRef.current.scrollTop = 0;
    }
  }

  useEffect(() => {
    if (initialPrompt && historyReady && !initialSent.current) {
      initialSent.current = true;
      void sendMessage(initialPrompt);
    }
  }, [initialPrompt, sendMessage, historyReady]);

  const hasConversation = messages.some((m) => m.role === "user");

  return (
    <div lang={locale} className="mx-auto flex h-[calc(100dvh-5.5rem)] max-w-4xl flex-col md:h-[calc(100dvh-8rem)]">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border bg-background shadow-sm">
        {/* Chat header */}
        <div className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-semibold">{t("ai.chat.askFlo")}</h2>
            <p className="truncate text-xs text-muted-foreground">
              {llmConfigured
                ? t("ai.chat.onlineModel", { model: providerStatus?.model ?? "LLM" })
                : t("ai.chat.localAnswers")}
            </p>
          </div>
          {hasConversation && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={handleClearHistory}
            >
              <Trash2 className="h-4 w-4" />
              {t("ai.chat.clearShort")}
            </Button>
          )}
          <div
            className={cn(
              "h-2.5 w-2.5 shrink-0 rounded-full",
              llmConfigured ? "bg-emerald-500" : "bg-amber-500"
            )}
            title={llmConfigured ? t("ai.chat.connected") : t("ai.chat.localAssistant")}
          />
        </div>

        {/* Suggested prompts */}
        <div className="shrink-0 border-b bg-muted/30 px-4 py-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("ai.chat.tryAsking")}
          </p>
          <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt.id}
                type="button"
                disabled={loading}
                onClick={() =>
                  void sendMessage(
                    t(`ai.suggested.${prompt.id}.message`)
                  )
                }
                className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {t(`ai.suggested.${prompt.id}.label`)}
              </button>
            ))}
          </div>
        </div>

        {/* Message thread — always opens at top; no auto-scroll on new messages */}
        <div
          ref={threadRef}
          className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto bg-muted/20 px-4 py-4"
        >
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
                {llmConfigured ? t("ai.chat.typing") : t("ai.chat.checkingLiveData")}
              </div>
            </div>
          )}
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
              placeholder={t("ai.chat.messagePlaceholder")}
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
              <span className="sr-only">{t("ai.chat.send")}</span>
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
