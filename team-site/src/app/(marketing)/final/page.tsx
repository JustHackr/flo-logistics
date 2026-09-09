"use client";

import { ButtonLink, PageIntro, TextLink } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

const RESOURCE_KINDS = ["demo", "presentation", "package", "source"] as const;

type ResourceKind = (typeof RESOURCE_KINDS)[number];

const RESOURCE_HREFS: Record<Exclude<ResourceKind, "package">, string> = {
  demo: "/flo-logistics/demo/login",
  presentation: "/presentation",
  source: "https://github.com/JustHackr/flo-logistics",
};

export default function FinalPage() {
  const { t, dict, locale } = useLocale();
  const resources = dict.final.resources.map((item, i) => ({
    ...item,
    kind: RESOURCE_KINDS[i]!,
  }));

  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow={t("final.eyebrow")}
          title={t("final.title")}
          description={<>{t("final.lede")}</>}
        />

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
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
                {r.kind === "package" ? (
                  <span
                    aria-disabled="true"
                    className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-sm border border-border bg-transparent px-4 py-2.5 text-sm font-semibold tracking-tight text-muted opacity-70"
                  >
                    {r.cta}
                  </span>
                ) : (
                  <ButtonLink
                    href={RESOURCE_HREFS[r.kind]}
                    variant="secondary"
                    className="w-full"
                    external={
                      r.kind === "demo" ||
                      r.kind === "source" ||
                      RESOURCE_HREFS[r.kind].startsWith("http")
                    }
                  >
                    {r.cta} →
                  </ButtonLink>
                )}
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
