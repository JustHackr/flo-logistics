import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";
import { PartnerRail } from "@/components/PartnerRail";
import { SiteImage } from "@/components/SiteImage";
import { PageIntro, TextLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Tentang Kami",
};

const members = [
  {
    name: "Justin Raditya Rizki",
    role: "Project Lead",
    detail: "Founder of stetoradr.com",
    href: "https://stetoradr.com",
    initials: "JR",
  },
  {
    name: "Arsene Matthew E. Naftali",
    role: "AI Engineer",
    detail: "Founder of optivox.site",
    href: "https://optivox.site",
    initials: "AM",
  },
  {
    name: "Nabiil Zhafran Alrilo Tarigan",
    role: "Designer & Interface",
    detail: "Co-founder of Foodloop AI",
    href: null as string | null,
    initials: "NZ",
  },
];

export default function AboutPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <PageIntro
          eyebrow="Tentang Kami"
          title="Quasarian Radr-Lyon Dynasty"
          description={
            <>
              Tiga anggota dari{" "}
              <span className="font-semibold text-ink">
                SMAS Pilar Indonesia
              </span>{" "}
              yang membangun FLO — sistem kecerdasan logistik untuk AI Open
              Innovation Challenge 2026 (Case Provider: Blibli), dengan dukungan
              ekosistem FabLab Jababeka dan Universitas Presiden.
            </>
          }
        />

        <figure className="mt-10 overflow-hidden border border-border bg-surface">
          <div className="relative aspect-[16/10] w-full">
            <SiteImage
              src="/images/team-fablab.png"
              alt="Tim Quasarian Radr-Lyon Dynasty di FABLAB — Justin Raditya Rizki, Arsene Matthew E. Naftali, dan Nabiil Zhafran Alrilo Tarigan"
              fill
              sizes="(max-width: 768px) 100vw, 1152px"
              className="object-cover object-center"
              priority
            />
          </div>
          <figcaption className="border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
            Tim FLO di FabLab — SMAS Pilar Indonesia.
          </figcaption>
        </figure>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {members.map((m) => (
            <article
              key={m.name}
              className="flex flex-col border border-border bg-surface p-6"
            >
              <Avatar initials={m.initials} />
              <h2 className="font-display mt-5 text-lg font-bold text-ink">
                {m.name}
              </h2>
              <p className="mt-1 text-sm font-semibold text-blue">{m.role}</p>
              {m.href ? (
                <a
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm text-muted underline-offset-4 transition hover:text-ink hover:underline"
                >
                  {m.detail}
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">{m.detail}</p>
              )}
            </article>
          ))}
        </div>

        <div className="mt-14 border border-border bg-surface p-6 sm:p-8">
          <PartnerRail label="Afiliasi & mitra" />
          <p className="mt-6 text-sm text-muted">
            Lihat juga{" "}
            <TextLink href="/presentation">deck presentasi</TextLink> atau{" "}
            <TextLink href="/final">paket final</TextLink>.
          </p>
        </div>
      </div>
    </div>
  );
}
