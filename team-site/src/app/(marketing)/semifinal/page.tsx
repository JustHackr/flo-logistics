import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Semifinal",
};

const LIVE_APP = "https://flo-logistics.vercel.app/";
const YOUTUBE_ID = "S3ME4D5sduM";

export default function SemifinalPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-medium tracking-[0.25em] text-teal uppercase">
          Fase 02
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Semifinal
        </h1>
        <p className="mt-4 max-w-2xl text-muted leading-relaxed">
          Babak semifinal menampilkan prototipe FLO yang dapat diakses secara
          live beserta video penjelasan untuk juri — bukti bahwa ide pra-seleksi
          sudah berjalan sebagai produk.
        </p>

        <div className="mt-8">
          <a
            href={LIVE_APP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-teal-dim"
          >
            Buka FLO Live App
          </a>
        </div>

        <div className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
            Video pitch
          </h2>
          <div className="mt-4 aspect-video overflow-hidden rounded-xl border border-border bg-black shadow-lg shadow-black/40">
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
            className="mt-3 inline-block text-sm text-muted hover:text-teal"
          >
            Buka di YouTube →
          </a>
        </div>

        <Link
          href="/final"
          className="mt-10 inline-block text-sm text-teal hover:underline"
        >
          Lanjut ke Final →
        </Link>
      </div>
    </div>
  );
}
