"use client";

import { ButtonLink, PageIntro } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

const PROPOSAL_URL =
  "https://drive.google.com/file/d/1c8f-1THAi4TozxX7LcI1pnTgPu5breM9/view";

export default function PreSelectionPage() {
  const { t, dict, locale } = useLocale();
  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <PageIntro
          eyebrow={t("preSelection.eyebrow")}
          title={t("preSelection.title")}
          description={<>{t("preSelection.lede")}</>}
        />

        <ol className="mt-10 space-y-3">
          {dict.preSelection.items.map((point, index) => (
            <li
              key={point}
              className="flex gap-4 border border-border bg-surface px-4 py-4"
            >
              <span className="font-mono text-xs font-semibold tracking-[0.14em] text-blue">
                0{index + 1}
              </span>
              <span className="text-sm leading-relaxed text-ink">{point}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href={PROPOSAL_URL} external>
            {t("preSelection.proposalCta")}
          </ButtonLink>
          <ButtonLink href="/semifinal" variant="secondary">
            {t("preSelection.nextCta")}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
