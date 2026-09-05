import { Suspense } from "react";
import { AiChatClient } from "@/components/ai-chat-client";
import { getLocale } from "@/lib/i18n/get-locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { t } from "@/lib/i18n/t";

export default async function AiChatPage() {
  const dict = await getDictionary(await getLocale());
  return (
    <div className="ai-chat-page">
      <Suspense
        fallback={
          <div className="text-sm text-muted-foreground">{t(dict, "ai.chat.loading")}</div>
        }
      >
        <AiChatClient />
      </Suspense>
    </div>
  );
}
