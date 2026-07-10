import { z } from "zod";

export const AI_CHAT_HISTORY_KEY = "balon-ai-chat-history";

const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  links: z
    .array(
      z.object({
        label: z.string(),
        href: z.string(),
      })
    )
    .optional(),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const WELCOME_CHAT_MESSAGE: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi — I'm your BALON supply chain & logistics operations expert. Ask about routes, drivers, orders, fleet health, fuel, or delivery KPIs.",
};

export function defaultChatMessages(): ChatMessage[] {
  return [WELCOME_CHAT_MESSAGE];
}

export function loadChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return defaultChatMessages();
  try {
    const raw = localStorage.getItem(AI_CHAT_HISTORY_KEY);
    if (!raw) return defaultChatMessages();
    const parsed = JSON.parse(raw) as unknown;
    const result = z.array(chatMessageSchema).safeParse(parsed);
    if (!result.success || result.data.length === 0) {
      return defaultChatMessages();
    }
    return result.data;
  } catch {
    return defaultChatMessages();
  }
}

export function saveChatHistory(messages: ChatMessage[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AI_CHAT_HISTORY_KEY, JSON.stringify(messages));
  } catch {
    /* storage full or unavailable */
  }
}

export function clearChatHistory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AI_CHAT_HISTORY_KEY);
}
