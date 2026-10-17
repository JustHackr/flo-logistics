"use client";

import { CanvaPresentationEmbed } from "@/components/CanvaPresentationEmbed";
import { PageIntro } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

export default function PresentationPage() {
  const { t, locale } = useLocale();
  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-5xl">
        <PageIntro
          eyebrow={t("final.eyebrow")}
          title={t("presentation.title")}
          description={<>{t("presentation.lede")}</>}
        />
        <div className="mt-10">
          <CanvaPresentationEmbed
            title={t("presentation.embedTitle")}
            openLabel={t("presentation.openCanva")}
          />
        </div>
      </div>
    </div>
  );
}
