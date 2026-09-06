import { JourneyCard } from "@/components/JourneyCard";
import { PartnerRail } from "@/components/PartnerRail";
import { RouteMotif } from "@/components/RouteMotif";
import { ButtonLink, SectionHeading } from "@/components/ui";

const journey = [
  {
    phase: "Fase 01",
    title: "Pra-Seleksi",
    description:
      "Ideasi FLO dan proposal awal: logistik hijau & tangguh berbasis AI.",
    href: "/pre-selection",
  },
  {
    phase: "Fase 02",
    title: "Semifinal",
    description:
      "Prototipe live dan video pitch — validasi teknis di depan juri.",
    href: "/semifinal",
  },
  {
    phase: "Fase 03",
    title: "Final",
    description:
      "Demo lengkap, presentasi, dan paket submission untuk babak final.",
    href: "/final",
  },
];

const capabilities = [
  {
    code: "01",
    title: "Predict",
    body: "Skor risiko SLA real-time dari histori pengiriman, lalu lintas, dan beban hub.",
  },
  {
    code: "02",
    title: "Route",
    body: "Optimasi multi-stop yang menyeimbangkan ETA, biaya operasional, dan jejak karbon.",
  },
  {
    code: "03",
    title: "Verify",
    body: "Computer vision untuk kepatuhan armada dan aset tanpa inspeksi manual penuh.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-blue text-white">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[46%] lg:block">
          <RouteMotif className="absolute top-10 right-[-8%] h-[120%] w-auto opacity-90" tone="yellow" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-24 sm:px-6 sm:pt-20 sm:pb-28">
          <p className="animate-fade-up text-[11px] font-semibold tracking-[0.18em] text-blue-soft uppercase">
            AI Open Innovation Challenge 2026 · Case Blibli
          </p>
          <h1 className="animate-fade-up-delay-1 font-display mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            One intelligence layer for every delivery.
          </h1>
          <p className="animate-fade-up-delay-2 mt-5 max-w-xl text-lg leading-relaxed text-white/85 sm:text-xl">
            <span className="font-semibold text-yellow">FLO</span> — Fab
            Logistics Operations: prediksi SLA, routing rendah karbon, dan
            kepatuhan visual armada untuk supply chain Blibli.
          </p>
          <p className="mt-3 max-w-xl text-sm text-white/70">
            Dibangun Quasarian Radr-Lyon Dynasty · SMAS Pilar Indonesia
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <ButtonLink href="/flo-logistics/demo" variant="yellow">
              Live Demo
            </ButtonLink>
            <ButtonLink
              href="/about"
              variant="secondary"
              className="border-white/40 text-white hover:border-white hover:bg-white/10"
            >
              Tentang Tim
            </ButtonLink>
            <ButtonLink
              href="/presentation"
              variant="ghost"
              className="text-white hover:bg-white/10"
            >
              Presentasi
            </ButtonLink>
          </div>

          <p className="mt-12 font-mono text-[11px] tracking-[0.14em] text-yellow uppercase">
            01 Predict — 02 Route — 03 Verify
          </p>
        </div>
      </section>

      <section className="border-b border-border bg-surface px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <PartnerRail label="Sekolah · universitas · lab · case provider" />
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow="Sistem"
            title="Tiga modul, satu lapisan keputusan"
            description="FLO mengorkestrasi prediksi, routing, dan verifikasi visual pada data operasional yang sama — agar rekomendasi tetap koheren di lapangan."
          />
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {capabilities.map((item) => (
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
            eyebrow="Kompetisi"
            title="Perjalanan kompetisi"
            description="Dari proposal hingga final — jejak FLO bersama Quasarian Radr-Lyon Dynasty."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {journey.map((item, index) => (
              <JourneyCard key={item.href} {...item} index={index} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
