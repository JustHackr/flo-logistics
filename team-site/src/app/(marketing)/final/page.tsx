"use client";

import { ButtonLink, PageIntro, TextLink } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

const RESOURCE_HREFS = [
  "/flo-logistics/demo",
  "/presentation",
  "/flo-logistics/downloads/flo-logistics-local.zip",
];

export default function FinalPage() {
  const { t, dict, locale } = useLocale();
  const resources = dict.final.resources.map((item, i) => ({ ...item, href: RESOURCE_HREFS[i] }));

  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow={t("final.eyebrow")}
          title={t("final.title")}
          description={<>{t("final.lede")}</>}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {resources.map((r) => (
            <article
              key={r.title}
              className="flex flex-col border border-border bg-surface p-5"
            >
              <h2 className="font-display text-lg font-bold text-ink">
                {r.title}
              </h2>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
                {r.description}
              </p>
              <div className="mt-5">
                <ButtonLink
                  href={r.href}
                  variant="secondary"
                  className="w-full"
                  external={
                    r.href.startsWith("/flo-logistics/demo") ||
                    r.href.startsWith("/flo-logistics/downloads")
                  }
                >
                  {r.cta} →
                </ButtonLink>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted">
          {`${t("final.homeLink")} · ${t("final.profileLink")}`}{" "}
          <TextLink href="/">{t("nav.home")}</TextLink> /{" "}
          <TextLink href="/about">{t("nav.about")}</TextLink>.
        </p>
      </div>
    </div>
  );
}
