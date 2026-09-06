import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pra-Seleksi",
};

const PROPOSAL_URL =
  "https://drive.google.com/file/d/1c8f-1THAi4TozxX7LcI1pnTgPu5breM9/view";

export default function PreSelectionPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium tracking-[0.25em] text-teal uppercase">
          Fase 01
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Pra-Seleksi
        </h1>
        <p className="mt-4 text-muted leading-relaxed">
          Pada tahap pra-seleksi, tim merumuskan masalah logistik hijau &amp;
          tangguh Blibli serta menawarkan FLO sebagai orkestrator AI: prediksi
          risiko SLA, optimasi rute rendah karbon, dan computer vision untuk
          kepatuhan operasional — dengan penekanan pada Sovereign AI dan
          keselarasan Stranas KA, UU PDP, serta UU ITE.
        </p>
        <ul className="mt-8 space-y-3 text-sm text-muted">
          <li className="rounded-lg border border-border bg-surface/60 px-4 py-3">
            Identifikasi pain point rantai pasok &amp; janji antar
          </li>
          <li className="rounded-lg border border-border bg-surface/60 px-4 py-3">
            Arsitektur solusi tiga modul (CV · Routing · Predictive Maintenance)
          </li>
          <li className="rounded-lg border border-border bg-surface/60 px-4 py-3">
            Proposal tertulis untuk juri pra-seleksi
          </li>
        </ul>

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={PROPOSAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-teal-dim"
          >
            Buka Proposal (Google Drive)
          </a>
          <Link
            href="/semifinal"
            className="rounded-md border border-border px-5 py-2.5 text-sm text-muted transition hover:border-teal/40 hover:text-foreground"
          >
            Lanjut ke Semifinal →
          </Link>
        </div>
      </div>
    </div>
  );
}
