"use client";

import { Avatar } from "@/components/Avatar";
import { PartnerRail } from "@/components/PartnerRail";
import { SiteImage } from "@/components/SiteImage";
import { PageIntro, TextLink } from "@/components/ui";
import { useLocale } from "@/components/LocaleProvider";

export default function AboutPage() {
  const { t, dict, locale } = useLocale();

  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <PageIntro
          eyebrow={t("about.title")}
          title={t("about.headline")}
          description={<>{t("about.lede")}</>}
        />

        <figure className="mt-10 overflow-hidden border border-border bg-surface">
          <div className="relative aspect-[16/10] w-full">
            <SiteImage
              src="/images/team-fablab.png"
              alt={t("about.photoAlt")}
              fill
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover object-center"
              priority
            />
          </div>
          <figcaption className="border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
            {t("about.caption")}
          </figcaption>
        </figure>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {dict.about.members.map((member) => {
            const initials = member.name
              .split(" ")
              .map((part) => part[0])
              .slice(0, 2)
              .join("");
            return (
              <article
                key={member.name}
                className="flex flex-col border border-border bg-surface p-6"
              >
                <Avatar initials={initials} />
                <h2 className="font-display mt-5 text-lg font-bold text-ink">
                  {member.name}
                </h2>
                <p className="mt-1 text-sm font-semibold text-blue">
                  {member.role}
                </p>
                {member.detailHref ? (
                  <a
                    href={member.detailHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
                  >
                    {member.detail}
                  </a>
                ) : (
                  <p className="mt-3 text-sm text-muted">{member.detail}</p>
                )}
                {"githubHref" in member && member.githubHref ? (
                  <a
                    href={member.githubHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
                  >
                    GitHub
                  </a>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-14 border border-border bg-surface p-6 sm:p-8">
          <PartnerRail label={t("about.partnersLabel")} />
          <p className="mt-6 text-sm text-muted">
            {`${t("about.presentationLink")} · ${t("about.packageLink")}`}{" "}
            <TextLink href="/presentation">{t("home.tertiaryCta")}</TextLink>{" "}
            / <TextLink href="/final">{t("about.packageLink")}</TextLink>.
          </p>
        </div>
      </div>
    </div>
  );
}
