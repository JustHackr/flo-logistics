import type { Metadata } from "next";
import { ButtonLink, PageIntro } from "@/components/ui";

export const metadata: Metadata = {
  title: "Pra-Seleksi",
};

const PROPOSAL_URL =
  "https://drive.google.com/file/d/1c8f-1THAi4TozxX7LcI1pnTgPu5breM9/view";

const points = [
  "Identifikasi pain point rantai pasok & janji antar",
  "Arsitektur solusi tiga modul (CV · Routing · Predictive Maintenance)",
  "Proposal tertulis untuk juri pra-seleksi",
];

export default function PreSelectionPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <PageIntro
          eyebrow="Fase 01 · Pra-Seleksi"
          title="Pra-Seleksi"
          description={
            <>
              Pada tahap pra-seleksi, tim merumuskan masalah logistik hijau
              &amp; tangguh Blibli serta menawarkan FLO sebagai orkestrator AI:
              prediksi risiko SLA, optimasi rute rendah karbon, dan computer
              vision untuk kepatuhan operasional — dengan penekanan pada
              Sovereign AI dan keselarasan Stranas KA, UU PDP, serta UU ITE.
            </>
          }
        />

        <ol className="mt-10 space-y-3">
          {points.map((point, index) => (
            <li
              key={point}
              className="flex gap-4 border border-border bg-surface px-4 py-4"
            >
              <span className="font-mono text-xs font-semibold tracking-[0.14em] text-blue">
                0{index + 1}
              </span>
              <span className="text-sm leading-relaxed text-ink">{point}</span>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href={PROPOSAL_URL} external>
            Buka Proposal (Google Drive)
          </ButtonLink>
          <ButtonLink href="/semifinal" variant="secondary">
            Lanjut ke Semifinal →
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
