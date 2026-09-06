import type { Metadata } from "next";
import { ButtonLink, PageIntro, TextLink } from "@/components/ui";

export const metadata: Metadata = {
  title: "Semifinal",
};

const LIVE_APP = "https://flo-logistics.vercel.app/";
const YOUTUBE_ID = "S3ME4D5sduM";

export default function SemifinalPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <PageIntro
          eyebrow="Fase 02 · Semifinal"
          title="Semifinal"
          description={
            <>
              Babak semifinal menampilkan prototipe FLO yang dapat diakses
              secara live beserta video penjelasan untuk juri — bukti bahwa ide
              pra-seleksi sudah berjalan sebagai produk.
            </>
          }
        />

        <div className="mt-8">
          <ButtonLink href={LIVE_APP} external>
            Buka FLO Live App
          </ButtonLink>
        </div>

        <div className="mt-12">
          <h2 className="font-display text-2xl font-bold text-ink">
            Video pitch
          </h2>
          <div className="mt-4 aspect-video overflow-hidden border border-border bg-ink">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${YOUTUBE_ID}`}
              title="FLO Semifinal — Quasarian Radr-Lyon Dynasty"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${YOUTUBE_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-sm font-medium text-blue hover:underline"
          >
            Buka di YouTube →
          </a>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <ButtonLink href="/final" variant="secondary">
            Lanjut ke Final →
          </ButtonLink>
          <TextLink href="/pre-selection">← Kembali ke Pra-Seleksi</TextLink>
        </div>
      </div>
    </div>
  );
}
