"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

type Slide = {
  id: string;
  eyebrow?: string;
  title: string;
  body: ReactNode;
};

const slides: Slide[] = [
  {
    id: "opening",
    eyebrow: "AI Open Innovation Challenge 2026",
    title: "Quasarian Radr-Lyon Dynasty",
    body: (
      <div className="flex w-full max-w-4xl flex-col gap-8">
        <p className="text-lg text-muted sm:text-xl">
          Memperkenalkan <span className="text-teal font-medium">FLO</span> —
          Fab Logistics Operations: kecerdasan buatan untuk logistik hijau
          &amp; tangguh.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {["Blibli", "FabLab", "Kemenko", "Pemprov DKI"].map((name) => (
            <div
              key={name}
              className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border bg-white/5 text-sm font-medium text-muted"
            >
              Logo {name}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted">SMAS Pilar Indonesia</p>
      </div>
    ),
  },
  {
    id: "problem",
    eyebrow: "Masalah",
    title: "Logistik hijau & tangguh untuk Blibli",
    body: (
      <ul className="max-w-3xl space-y-4 text-base leading-relaxed text-muted sm:text-lg">
        <li className="border-l-2 border-teal/60 pl-4">
          Keterlambatan pengiriman dan risiko SLA yang sulit diprediksi secara
          dini.
        </li>
        <li className="border-l-2 border-teal/60 pl-4">
          Rute yang belum optimal — biaya operasional &amp; jejak karbon tinggi.
        </li>
        <li className="border-l-2 border-teal/60 pl-4">
          Kepatuhan armada &amp; infrastruktur yang masih bergantung pada
          inspeksi manual.
        </li>
        <li className="border-l-2 border-teal/60 pl-4">
          Kebutuhan solusi AI yang berdaulat, aman, dan selaras regulasi
          Indonesia.
        </li>
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
          <div
            key={m.t}
            className="rounded-xl border border-border bg-white/5 p-5"
          >
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-teal">
              {m.t}
            </h3>
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
      <div className="max-w-3xl space-y-4 text-base text-muted sm:text-lg">
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
      <div className="max-w-3xl space-y-4 text-base text-muted sm:text-lg">
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
      <div className="max-w-3xl space-y-4 text-base text-muted sm:text-lg">
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
      <div className="max-w-4xl space-y-5">
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
            <div
              key={item.t}
              className="rounded-xl border border-teal/30 bg-teal/5 p-4"
            >
              <h3 className="font-[family-name:var(--font-display)] text-base font-semibold text-teal">
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
              className="rounded-lg border border-border bg-white/5 p-4 text-center"
            >
              <span className="text-xs tracking-widest text-teal">
                0{i + 1}
              </span>
              <p className="mt-2 text-sm font-medium text-foreground">{step}</p>
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
            className="rounded-xl border border-border bg-gradient-to-b from-indigo/20 to-transparent p-6 text-center"
          >
            <p className="font-[family-name:var(--font-display)] text-3xl font-semibold text-teal">
              {s.v}
            </p>
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
      <ol className="max-w-3xl space-y-4 text-base text-muted sm:text-lg">
        <li>
          <span className="font-semibold text-foreground">Fase 1 — Pilot:</span>{" "}
          prediksi SLA + dashboard di satu koridor/hub.
        </li>
        <li>
          <span className="font-semibold text-foreground">Fase 2 — Scale:</span>{" "}
          routing karbon &amp; CV kepatuhan di multi-hub.
        </li>
        <li>
          <span className="font-semibold text-foreground">Fase 3 — Platform:</span>{" "}
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
      <div className="max-w-2xl space-y-6 text-center">
        <p className="text-lg text-muted">
          Quasarian Radr-Lyon Dynasty · FLO
        </p>
        <p className="text-sm text-muted">
          Demo: /flo-logistics/demo · Presentasi dapat diekspor PDF (Print)
        </p>
        <p className="text-teal">Pertanyaan &amp; diskusi terbuka</p>
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
    <div className="presentation-root relative min-h-screen bg-[#070f1c] text-foreground">
      <div
        className="pointer-events-none absolute inset-0 opacity-30 print:hidden"
        style={{
          backgroundImage: "url(/flo-logistics/images/slide-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="no-print fixed top-0 right-0 left-0 z-20 flex items-center justify-between gap-3 border-b border-border/60 bg-[#070f1c]/90 px-4 py-2 backdrop-blur">
        <a
          href="/flo-logistics/"
          className="text-xs text-muted transition hover:text-teal"
        >
          ← Kembali ke situs
        </a>
        <p className="text-xs text-muted">
          ← → untuk navigasi · Print untuk PDF
        </p>
        <p className="text-xs font-medium text-teal">
          {index + 1} / {total}
        </p>
      </div>

      {/* Screen mode: one active slide */}
      <div className="print:hidden flex min-h-screen items-center justify-center px-6 pt-14 pb-20">
        {slides.map((slide, i) => (
          <section
            key={slide.id}
            className={`presentation-slide absolute inset-0 flex flex-col items-center justify-center px-6 pt-16 pb-20 transition-opacity duration-300 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
              {slide.eyebrow && (
                <p className="mb-3 text-xs tracking-[0.25em] text-teal uppercase">
                  {slide.eyebrow}
                </p>
              )}
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {slide.title}
              </h1>
              <div className="mt-8 flex w-full justify-center">{slide.body}</div>
            </div>
          </section>
        ))}
      </div>

      {/* Print mode: all slides stacked as pages */}
      <div className="hidden print:block">
        {slides.map((slide) => (
          <section
            key={`print-${slide.id}`}
            className="presentation-slide flex flex-col items-center justify-center px-12"
          >
            <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
              {slide.eyebrow && (
                <p className="mb-3 text-xs tracking-[0.25em] text-teal uppercase">
                  {slide.eyebrow}
                </p>
              )}
              <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold text-foreground">
                {slide.title}
              </h1>
              <div className="mt-8 flex w-full justify-center">{slide.body}</div>
            </div>
          </section>
        ))}
      </div>

      <div className="no-print fixed right-0 bottom-0 left-0 z-20 flex items-center justify-center gap-3 border-t border-border/60 bg-[#070f1c]/90 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="rounded-md border border-border px-4 py-2 text-sm text-muted hover:border-teal/40 hover:text-foreground"
        >
          Sebelumnya
        </button>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => go(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === index ? "bg-teal" : "bg-white/20 hover:bg-white/40"
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => go(index + 1)}
          className="rounded-md bg-teal px-4 py-2 text-sm font-semibold text-navy hover:bg-teal-dim"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}
