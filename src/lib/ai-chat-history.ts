import { z } from "zod";
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "@/lib/safe-storage";

export const AI_CHAT_HISTORY_KEY = "flo-ai-chat-history";

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
    "Hi — I'm your FLO supply chain & logistics operations expert. Ask about routes, drivers, orders, fleet health, fuel, or delivery KPIs.",
};

export function defaultChatMessages(): ChatMessage[] {
  return [WELCOME_CHAT_MESSAGE];
}

export function loadChatHistory(): ChatMessage[] {
  try {
    const raw = readLocalStorage(AI_CHAT_HISTORY_KEY);
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
  writeLocalStorage(AI_CHAT_HISTORY_KEY, JSON.stringify(messages));
}

export function clearChatHistory() {
  removeLocalStorage(AI_CHAT_HISTORY_KEY);
}
