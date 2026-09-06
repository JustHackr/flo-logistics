import type { Metadata } from "next";
import { ButtonLink, PageIntro, TextLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Final",
};

const resources = [
  {
    title: "Live Demo",
    description: "Coba FLO secara interaktif di lingkungan demo.",
    href: "/flo-logistics/demo",
    cta: "Buka Demo",
  },
  {
    title: "Presentasi",
    description: "Deck slide final — navigasi keyboard, siap diekspor PDF.",
    href: "/presentation",
    cta: "Buka Presentasi",
  },
  {
    title: "Paket Unduhan",
    description:
      "Sumber FLO siap dijalankan lokal (Node + SQLite). Ekstrak, lalu npm run setup && npm run dev.",
    href: "/flo-logistics/downloads/flo-logistics-local.zip",
    cta: "Download Package",
  },
];

export default function FinalPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow="Fase 03 · Final"
          title="Final"
          description={
            <>
              Babak final menghadirkan demo produk, presentasi lengkap, dan
              paket dokumen untuk evaluasi juri.
            </>
          }
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
          Kembali ke <TextLink href="/">beranda</TextLink> atau lihat{" "}
          <TextLink href="/about">profil tim</TextLink>.
        </p>
      </div>
    </div>
  );
}
