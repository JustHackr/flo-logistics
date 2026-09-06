"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { SiteImage } from "@/components/SiteImage";
import { PARTNERS } from "@/lib/partners";

type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  body: ReactNode;
};

function PartnerLogoGrid() {
  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
      {PARTNERS.map((partner) => (
        <div
          key={partner.name}
          className="flex h-20 items-center justify-center border border-border bg-surface px-3"
        >
          <span className={`relative block ${partner.boxClass}`}>
            <SiteImage
              src={partner.src}
              alt={partner.alt}
              fill
              sizes="140px"
              className="object-contain"
            />
          </span>
        </div>
      ))}
    </div>
  );
}

const slides: Slide[] = [
  {
    id: "opening",
    eyebrow: "AI Open Innovation Challenge 2026",
    title: "Quasarian Radr-Lyon Dynasty",
    body: (
      <div className="flex w-full max-w-4xl flex-col gap-8">
        <p className="text-lg text-muted sm:text-xl">
          Memperkenalkan <span className="font-semibold text-blue">FLO</span> —
          Fab Logistics Operations: kecerdasan buatan untuk logistik hijau
          &amp; tangguh.
        </p>
        <PartnerLogoGrid />
        <p className="text-sm text-muted">
          SMAS Pilar Indonesia · Universitas Presiden · FabLab Jababeka · Blibli
        </p>
      </div>
    ),
  },
  {
    id: "problem",
    eyebrow: "Masalah",
    title: "Logistik hijau & tangguh untuk Blibli",
    body: (
      <ul className="max-w-3xl space-y-4 text-left text-base leading-relaxed text-muted sm:text-lg">
        {[
          "Keterlambatan pengiriman dan risiko SLA yang sulit diprediksi secara dini.",
          "Rute yang belum optimal — biaya operasional & jejak karbon tinggi.",
          "Kepatuhan armada & infrastruktur yang masih bergantung pada inspeksi manual.",
          "Kebutuhan solusi AI yang berdaulat, aman, dan selaras regulasi Indonesia.",
        ].map((item) => (
          <li key={item} className="border-l-4 border-blue pl-4">
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "solution",
    eyebrow: "Solusi",
    title: "FLO — tiga modul terintegrasi",
    body: (
      <div className="grid w-full max-w-5xl gap-4 sm:grid-cols-3">
        {[
          {
            t: "Computer Vision",
            d: "Deteksi kepatuhan & kondisi aset secara visual di lapangan.",
          },
          {
            t: "Routing Cerdas",
            d: "Optimasi rute multi-objektif: waktu, biaya, dan karbon.",
          },
          {
            t: "Predictive Maintenance",
            d: "Prediksi risiko kerusakan sebelum mengganggu operasi.",
          },
        ].map((m) => (
          <div key={m.t} className="border border-border bg-surface p-5 text-left">
            <h3 className="font-display text-lg font-bold text-blue">{m.t}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{m.d}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "sla",
    eyebrow: "Modul 1",
    title: "Prediksi risiko SLA & keterlambatan",
    body: (
      <div className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <p>
          Model prediktif memperkirakan kemungkinan keterlambatan berdasarkan
          histori pengiriman, kondisi lalu lintas, cuaca, dan beban hub.
        </p>
        <ul className="space-y-3">
          <li>• Skor risiko SLA real-time per pengiriman</li>
          <li>• Peringatan dini untuk dispatcher &amp; mitra logistik</li>
          <li>• Rekomendasi aksi mitigasi sebelum janji antar terlanggar</li>
        </ul>
      </div>
    ),
  },
  {
    id: "routing",
    eyebrow: "Modul 2",
    title: "Routing optimal + jejak karbon",
    body: (
      <div className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <p>
          Optimasi rute menyeimbangkan kecepatan layanan dengan efisiensi energi
          dan emisi — mendukung agenda logistik hijau Blibli.
        </p>
        <ul className="space-y-3">
          <li>• Multi-stop routing dengan constraint kapasitas</li>
          <li>• Estimasi emisi CO₂e per rute</li>
          <li>• Trade-off transparan antara ETA dan dampak lingkungan</li>
        </ul>
      </div>
    ),
  },
  {
    id: "cv",
    eyebrow: "Modul 3",
    title: "Computer Vision untuk kepatuhan",
    body: (
      <div className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <p>
          CV membantu memverifikasi kondisi armada, packing, dan infrastruktur
          secara otomatis — mengurangi ketergantungan inspeksi manual.
        </p>
        <ul className="space-y-3">
          <li>• Deteksi anomali visual pada aset &amp; kendaraan</li>
          <li>• Checklist kepatuhan berbasis gambar</li>
          <li>• Integrasi dengan alur predictive maintenance</li>
        </ul>
      </div>
    ),
  },
  {
    id: "sovereign",
    eyebrow: "Penekanan utama",
    title: "Sovereign AI & kerangka regulasi",
    body: (
      <div className="max-w-4xl space-y-5 text-left">
        <p className="text-base text-muted sm:text-lg">
          Lebih dari 90% data enterprise/pemerintah masih di infrastruktur asing.
          FLO dibangun self-hostable di infrastruktur lokal — data logistik,
          pengemudi, dan pelanggan tetap di bawah hukum Indonesia.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              t: "Stranas KA 2020–2045",
              d: "Selaras empat pilar: etika & kebijakan, talenta, infrastruktur & data, riset & inovasi — plus Visi Indonesia Emas 2045.",
            },
            {
              t: "UU PDP No. 27/2022",
              d: "Data pribadi tetap di dalam negeri: SQLite lokal, tanpa keharusan cloud asing, kontrol akses berbasis peran (RBAC).",
            },
            {
              t: "UU ITE (UU 1/2024)",
              d: "Kewajiban penyelenggara sistem elektronik, jejak audit, dan keamanan transaksi digital operasional.",
            },
          ].map((item) => (
            <div key={item.t} className="border border-blue/30 bg-blue-soft/50 p-4">
              <h3 className="font-display text-base font-bold text-blue">
                {item.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">
          Bukti teknis: LLM yang bisa diganti (tanpa vendor lock-in), computer
          vision on-device di browser (video tidak keluar gudang), arsitektur
          modular open — sejalan prinsip Sovereign AI Initiative.
        </p>
      </div>
    ),
  },
  {
    id: "architecture",
    eyebrow: "Arsitektur",
    title: "Pipeline FLO end-to-end",
    body: (
      <div className="flex w-full max-w-4xl flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            "Ingest data operasional",
            "Feature & model layer",
            "Orkestrasi keputusan",
            "Dashboard & aksi",
          ].map((step, i) => (
            <div
              key={step}
              className="border border-border bg-surface p-4 text-center"
            >
              <span className="font-mono text-xs tracking-widest text-blue">
                0{i + 1}
              </span>
              <p className="mt-2 text-sm font-semibold text-ink">{step}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted sm:text-base">
          Modul CV, routing, dan prediksi berbagi lapisan data yang sama —
          menghasilkan rekomendasi yang koheren untuk operasi harian.
        </p>
      </div>
    ),
  },
  {
    id: "impact",
    eyebrow: "Dampak",
    title: "Estimasi dampak operasional",
    body: (
      <div className="grid w-full max-w-4xl gap-4 sm:grid-cols-3">
        {[
          { v: "↓ 15–25%", l: "Pelanggaran SLA (target skenario)" },
          { v: "↓ 8–12%", l: "Jejak karbon rute teroptimasi" },
          { v: "↑ Visibilitas", l: "Risiko aset sebelum gangguan" },
        ].map((s) => (
          <div
            key={s.l}
            className="border border-border bg-surface p-6 text-center"
          >
            <p className="font-display text-3xl font-bold text-blue">{s.v}</p>
            <p className="mt-2 text-sm text-muted">{s.l}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "roadmap",
    eyebrow: "Bisnis & roadmap",
    title: "Jalur implementasi",
    body: (
      <ol className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <li>
          <span className="font-semibold text-ink">Fase 1 — Pilot:</span>{" "}
          prediksi SLA + dashboard di satu koridor/hub.
        </li>
        <li>
          <span className="font-semibold text-ink">Fase 2 — Scale:</span>{" "}
          routing karbon &amp; CV kepatuhan di multi-hub.
        </li>
        <li>
          <span className="font-semibold text-ink">Fase 3 — Platform:</span>{" "}
          API internal, governance AI, dan perluasan mitra logistik.
        </li>
      </ol>
    ),
  },
  {
    id: "closing",
    eyebrow: "Terima kasih",
    title: "Mari wujudkan logistik yang lebih cerdas",
    body: (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <p className="text-lg text-muted">Quasarian Radr-Lyon Dynasty · FLO</p>
        <PartnerLogoGrid />
        <p className="text-sm text-muted">
          Demo: /flo-logistics/demo · Presentasi dapat diekspor PDF (Print)
        </p>
        <p className="font-semibold text-blue">Pertanyaan &amp; diskusi terbuka</p>
      </div>
    ),
  },
];

export function PresentationDeck() {
  const [index, setIndex] = useState(0);
  const total = slides.length;

  const go = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") {
        e.preventDefault();
        go(0);
      } else if (e.key === "End") {
        e.preventDefault();
        go(total - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  return (
    <div className="presentation-root relative min-h-screen bg-background text-foreground">
      <div className="no-print fixed top-0 right-0 left-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3">
        <a
          href="/flo-logistics/"
          className="min-h-10 min-w-10 text-sm font-medium text-muted transition hover:text-blue"
        >
          ← Kembali ke situs
        </a>
        <p className="hidden text-xs text-muted sm:block">
          ← → untuk navigasi · Print untuk PDF
        </p>
        <p className="font-mono text-xs font-semibold text-blue">
          {index + 1} / {total}
        </p>
      </div>

      <div className="print:hidden relative flex min-h-screen items-center justify-center px-6 pt-16 pb-24">
        {slides.map((slide, i) => (
          <section
            key={slide.id}
            className={`presentation-slide absolute inset-0 flex flex-col items-center justify-center px-6 pt-16 pb-24 transition-opacity duration-300 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
              {slide.eyebrow ? (
                <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-blue uppercase">
                  {slide.eyebrow}
                </p>
              ) : null}
              <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl md:text-5xl">
                {slide.title}
              </h1>
              <div className="mt-8 flex w-full justify-center">{slide.body}</div>
            </div>
          </section>
        ))}
      </div>

      <div className="hidden print:block">
        {slides.map((slide) => (
          <section
            key={`print-${slide.id}`}
            className="presentation-slide flex flex-col items-center justify-center px-12"
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
              {slide.eyebrow ? (
                <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-blue uppercase">
                  {slide.eyebrow}
                </p>
              ) : null}
              <h1 className="font-display text-4xl font-bold text-ink">
                {slide.title}
              </h1>
              <div className="mt-8 flex w-full justify-center">{slide.body}</div>
            </div>
          </section>
        ))}
      </div>

      <div className="no-print fixed right-0 bottom-0 left-0 z-20 flex items-center justify-center gap-3 border-t border-border bg-surface/95 px-4 py-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="min-h-11 rounded-sm border border-border px-4 py-2.5 text-sm font-medium text-muted hover:border-ink hover:text-ink"
        >
          Sebelumnya
        </button>
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
              className={`h-3 w-3 rounded-full transition ${
                i === index ? "bg-blue" : "bg-border hover:bg-muted"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="min-h-11 rounded-sm bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-deep"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
