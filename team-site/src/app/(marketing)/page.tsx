import Link from "next/link";
import { JourneyCard } from "@/components/JourneyCard";

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

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage: "url(/flo-logistics/images/flo-hero.png)",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy/70 via-navy/85 to-navy" />
        <div className="pointer-events-none absolute top-20 right-[10%] h-40 w-40 rounded-full bg-teal/20 blur-3xl animate-pulse-glow" />
        <div className="pointer-events-none absolute top-40 left-[5%] h-56 w-56 rounded-full bg-indigo/25 blur-3xl" />

        <div className="relative mx-auto max-w-6xl">
          <p className="animate-fade-up text-xs font-medium tracking-[0.28em] text-teal uppercase">
            AI Open Innovation Challenge 2026 · Case Blibli
          </p>
          <h1 className="animate-fade-up-delay-1 mt-4 max-w-4xl font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            Quasarian Radr-Lyon Dynasty
          </h1>
          <p className="animate-fade-up-delay-2 mt-5 max-w-2xl text-lg text-muted sm:text-xl">
            Membangun{" "}
            <span className="font-semibold text-foreground">FLO</span> — Fab
            Logistics Operations: AI untuk prediksi SLA, routing rendah karbon,
            dan kepatuhan visual armada.
          </p>
          <p className="mt-2 max-w-2xl text-sm text-muted/80">
            Green &amp; resilient logistics intelligence for Blibli&apos;s
            next-generation supply chain.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <a
              href="/flo-logistics/demo"
              className="rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-teal-dim"
            >
              Live Demo
            </a>
            <Link
              href="/about"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-teal/40 hover:bg-white/5"
            >
              Tentang Tim
            </Link>
            <Link
              href="/presentation"
              className="rounded-md border border-border px-5 py-2.5 text-sm font-medium text-muted transition hover:border-teal/40 hover:text-foreground"
            >
              Presentasi
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-foreground sm:text-3xl">
              Perjalanan kompetisi
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Dari proposal hingga final — jejak FLO bersama Quasarian
              Radr-Lyon Dynasty.
            </p>
          </div>
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
