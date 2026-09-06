"use client";

import { JourneyCard } from "@/components/JourneyCard";
import { HeroMapIllustration } from "@/components/HeroMapIllustration";
import { PartnerRail } from "@/components/PartnerRail";
import { ButtonLink, SectionHeading } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

const phaseHrefs = ["/pre-selection", "/semifinal", "/final"];

export default function HomePage() {
  const { t, dict, locale } = useLocale();
  const journey = dict.home.journey.map((step, i) => ({
    phase: step.phase,
    title: step.title,
    description: step.description,
    cta: step.cta,
    href: phaseHrefs[i],
  }));

  return (
    <div lang={locale}>
      <section className="relative overflow-hidden bg-blue text-white">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block">
          <HeroMapIllustration className="absolute top-10 right-[-6%] h-[120%] w-auto opacity-95" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-6 sm:pt-20 sm:pb-28">
          <p className="animate-fade-up text-[11px] font-semibold tracking-[0.18em] text-blue-soft uppercase">
            {t("home.eyebrow")}
          </p>
          <h1 className="animate-fade-up-delay-1 font-display mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            {t("home.headline")}
          </h1>
          <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            <span className="font-semibold text-yellow">
              {t("home.ledeStrong")}
            </span>
            {t("home.ledeRest")}
          </p>
          <p className="mt-3 max-w-xl text-sm text-white/70">
            {t("home.builtBy")}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/flo-logistics/demo" variant="yellow">
              {t("home.primaryCta")}
            </ButtonLink>
            <ButtonLink
              href="/about"
              variant="secondary"
              className="border-white/40 text-white hover:border-white hover:bg-white/10"
            >
              {t("home.secondaryCta")}
            </ButtonLink>
            <ButtonLink
              href="/presentation"
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              {t("home.tertiaryCta")}
            </ButtonLink>
          </div>

          <p className="mt-12 font-mono text-[11px] tracking-[0.14em] text-yellow uppercase">
            {t("home.moduleEyebrow")}
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <PartnerRail label={t("home.partnersLabel")} />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={t("home.systemEyebrow")}
            title={t("home.systemTitle")}
            description={t("home.systemDescription")}
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {dict.home.capabilities.map((item) => (
              <article
                key={item.code}
                className="border border-border bg-surface p-6"
              >
                <p className="font-mono text-xs font-semibold tracking-[0.16em] text-blue">
                  {item.code}
                </p>
                <h3 className="font-display mt-3 text-2xl font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface-muted/50 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={t("home.competitionEyebrow")}
            title={t("home.competitionTitle")}
            description={t("home.competitionDescription")}
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {journey.map((item, index) => (
              <JourneyCard
                key={item.href}
                phase={item.phase}
                title={item.title}
                description={item.description}
                href={item.href}
                cta={item.cta}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
