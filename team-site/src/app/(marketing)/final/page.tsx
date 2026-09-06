import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Final",
};

const resources = [
  {
    title: "Live Demo",
    description: "Coba FLO secara interaktif di lingkungan demo.",
    href: "/flo-logistics/demo",
    external: false,
    cta: "Buka Demo",
  },
  {
    title: "Presentasi",
    description: "Deck slide final — navigasi keyboard, siap diekspor PDF.",
    href: "/flo-logistics/presentation",
    external: false,
    cta: "Buka Presentasi",
  },
  {
    title: "Paket Unduhan",
    description:
      "Sumber FLO siap dijalankan lokal (Node + SQLite). Ekstrak, lalu npm run setup && npm run dev.",
    href: "/flo-logistics/downloads/flo-logistics-local.zip",
    external: false,
    cta: "Download Package",
  },
];

export default function FinalPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-medium tracking-[0.25em] text-teal uppercase">
          Fase 03
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Final
        </h1>
        <p className="mt-4 max-w-2xl text-muted leading-relaxed">
          Babak final menghadirkan demo produk, presentasi lengkap, dan paket
          dokumen untuk evaluasi juri. Semua tautan di bawah memakai path absolut
          dengan base path aplikasi.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {resources.map((r) => (
            <a
              key={r.title}
              id={r.href === "#download" ? "download" : undefined}
              href={r.href}
              className="group flex flex-col rounded-xl border border-border bg-surface/70 p-5 transition hover:border-teal/40 hover:bg-surface-elevated"
            >
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                {r.title}
              </h2>
              <p className="mt-2 flex-1 text-sm text-muted">{r.description}</p>
              <span className="mt-4 text-sm font-medium text-teal group-hover:underline">
                {r.cta} →
              </span>
            </a>
          ))}
        </div>

        <p className="mt-10 text-sm text-muted">
          Kembali ke{" "}
          <Link href="/" className="text-teal hover:underline">
            beranda
          </Link>{" "}
          atau lihat{" "}
          <Link href="/about" className="text-teal hover:underline">
            profil tim
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
