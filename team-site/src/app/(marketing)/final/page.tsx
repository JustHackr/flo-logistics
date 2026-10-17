"use client";

import { ButtonLink, PageIntro, TextLink } from "@/components/ui";
import { CanvaPresentationEmbed } from "@/components/CanvaPresentationEmbed";
import { useLocale } from "@/components/LocaleProvider";

const RESOURCE_KINDS = ["demo", "presentation", "package", "source"] as const;

type ResourceKind = (typeof RESOURCE_KINDS)[number];

const RESOURCE_HREFS: Record<Exclude<ResourceKind, "package">, string> = {
  demo: "/flo-logistics/demo/login",
  presentation: "/presentation",
  source: "https://github.com/JustHackr/flo-logistics",
};

const BOOTSTRAP = `curl -fsSL https://raw.githubusercontent.com/JustHackr/flo-logistics/main/scripts/bootstrap.sh | bash
cd flo-logistics
npm run dev`;

const OLLAMA = `curl -fsSL https://raw.githubusercontent.com/JustHackr/flo-logistics/main/scripts/bootstrap.sh | bash -s -- --mode=ollama --pull-ollama`;

const ALREADY_CLONED = `npm run install:flo -- --yes
# or: npm run install:flo -- --yes --mode=ollama --pull-ollama
# or: npm run install:flo -- --yes --mode=openai_compatible --api-key=sk-… --base-url=https://api.openai.com/v1 --model=gpt-4o-mini`;

const INTERACTIVE = `git clone https://github.com/JustHackr/flo-logistics.git
cd flo-logistics
npm run install:flo
npm run dev`;

function CommandBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto border border-border bg-surface-muted p-3 text-xs leading-relaxed text-ink">
      <code>{children}</code>
    </pre>
  );
}

export default function FinalPage() {
  const { t, dict, locale } = useLocale();
  const resources = dict.final.resources.map((item, i) => ({
    ...item,
    kind: RESOURCE_KINDS[i]!,
  }));
  const install = dict.final.install;

  return (
    <div lang={locale} className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow={t("final.eyebrow")}
          title={t("final.title")}
          description={<>{t("final.lede")}</>}
        />

        <div className="mt-10">
          <h2 className="font-display text-2xl font-bold text-ink">
            {t("presentation.title")}
          </h2>
          <div className="mt-4">
            <CanvaPresentationEmbed
              title={t("presentation.embedTitle")}
              openLabel={t("presentation.openCanva")}
            />
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {resources
            .filter(
              (
                r,
              ): r is (typeof resources)[number] & {
                kind: Exclude<ResourceKind, "package">;
              } => r.kind !== "package",
            )
            .map((r) => (
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
                </div>
              </article>
            ))}
          <article className="flex flex-col border border-border bg-surface p-5">
            <h2 className="font-display text-lg font-bold text-ink">
              {t("final.androidTitle")}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
              {t("final.androidBody")}
            </p>
            <div className="mt-5">
              <ButtonLink
                href="/flo-logistics/downloads/flo-logistics.apk"
                variant="secondary"
                className="w-full"
                external
              >
                {t("final.androidCta")} →
              </ButtonLink>
            </div>
          </article>
        </div>

        <article className="mt-4 border border-border bg-surface p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-ink">
              {install.title}
            </h2>
            <a
              href={install.sourceHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue hover:underline"
            >
              {install.sourceLabel} →
            </a>
          </div>

          <h3 className="mt-6 text-sm font-bold tracking-tight text-ink">
            {install.requirementsTitle}
          </h3>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <tbody>
                {install.requirements.map(([name, notes]) => (
                  <tr key={name} className="border-b border-border">
                    <th className="py-2 pr-4 align-top font-semibold text-ink">
                      {name}
                    </th>
                    <td className="py-2 text-muted">{notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {install.webcam}{" "}
            <a
              href="https://radr.nxtdev.xyz/flo-logistics/demo/computer-vision/tour"
              className="font-semibold text-blue hover:underline"
            >
              CV tour
            </a>
          </p>

          <h3 className="mt-6 text-sm font-bold tracking-tight text-ink">
            {install.automatedTitle}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {install.automatedBody}
          </p>
          <CommandBlock>{BOOTSTRAP}</CommandBlock>

          <h3 className="mt-6 text-sm font-bold tracking-tight text-ink">
            {install.ollamaTitle}
          </h3>
          <CommandBlock>{OLLAMA}</CommandBlock>

          <h3 className="mt-6 text-sm font-bold tracking-tight text-ink">
            {install.clonedTitle}
          </h3>
          <CommandBlock>{ALREADY_CLONED}</CommandBlock>

          <h3 className="mt-6 text-sm font-bold tracking-tight text-ink">
            {install.interactiveTitle}
          </h3>
          <CommandBlock>{INTERACTIVE}</CommandBlock>

          <p className="mt-6 text-sm leading-relaxed text-muted">
            {install.loginLead}
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-border text-ink">
                  {install.personaHeaders.map((header) => (
                    <th key={header} className="py-2 pr-4 font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {install.personas.map(([persona, email, password]) => (
                  <tr key={email} className="border-b border-border">
                    <td className="py-2 pr-4 text-ink">{persona}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted">
                      {email}
                    </td>
                    <td className="py-2 font-mono text-xs text-muted">
                      {password}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            {install.configure}
          </p>
        </article>

        <p className="mt-10 text-sm text-muted">
          {`${t("final.homeLink")} · ${t("final.profileLink")}`}{" "}
          <TextLink href="/">{t("nav.home")}</TextLink> /{" "}
          <TextLink href="/about">{t("nav.about")}</TextLink>.
        </p>
      </div>
    </div>
  );
}
