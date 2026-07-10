import { Suspense } from "react";
import { AiChatClient } from "@/components/ai-chat-client";

export default function AiChatPage() {
  return (
    <div className="ai-chat-page">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">Loading assistant…</div>
        }
      >
        <AiChatClient />
      </Suspense>
    </div>
  );
}
