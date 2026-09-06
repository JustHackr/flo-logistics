"use client";

import { ButtonLink, PageIntro, TextLink } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

const LIVE_APP = "https://flo-logistics.vercel.app/";
const YOUTUBE_ID = "S3ME4D5sduM";

export default function SemifinalPage() {
  const { t, locale } = useLocale();
  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow={t("semifinal.eyebrow")}
          title={t("semifinal.title")}
          description={<>{t("semifinal.lede")}</>}
        />

        <div className="mt-8">
          <ButtonLink href={LIVE_APP} external>
            {t("semifinal.liveCta")}
          </ButtonLink>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold text-ink">
            {t("semifinal.videoHeading")}
          </h2>
          <div className="mt-4 aspect-video overflow-hidden border border-border bg-ink">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}`}
              title={t("semifinal.videoTitle")}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-blue hover:underline"
          >
            {t("semifinal.openYoutube")}
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <ButtonLink href="/final" variant="secondary">
            {t("semifinal.nextCta")}
          </ButtonLink>
          <TextLink href="/pre-selection">{t("semifinal.backCta")}</TextLink>
        </div>
      </div>
    </div>
  );
}
