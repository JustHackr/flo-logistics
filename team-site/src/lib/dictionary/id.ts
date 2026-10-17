import type { Dictionary } from ".";

export const id = {
  common: {
    skipToContent: "Lewati ke konten",
    liveDemo: "Live Demo",
    openMenu: "Menu",
    primaryMenu: "Navigasi utama",
    mobileMenu: "Navigasi mobile",
    partnersAndAffiliates: "Mitra & afiliasi",
  },
  nav: {
    home: "Beranda",
    about: "Tentang",
    preSelection: "Pra-Seleksi",
    semifinal: "Semifinal",
    final: "Final",
  },
  home: {
    eyebrow: "AI Open Innovation Challenge 2026 · Case Blibli",
    headline: "One intelligence layer for every delivery.",
    ledeStrong: "FLO",
    ledeRest:
      " — Fab Logistics Operations: prediksi SLA, routing rendah karbon, dan kepatuhan visual armada untuk supply chain Blibli.",
    builtBy: "Dibangun Quasarian Radr-Lyon Dynasty · SMAS Pilar Indonesia",
    primaryCta: "Buka Live Demo",
    secondaryCta: "Tentang Tim",
    tertiaryCta: "Presentasi",
    moduleEyebrow: "01 Predict — 02 Route — 03 Verify",
    partnersLabel: "Sekolah · universitas · lab · case provider",
    systemEyebrow: "Sistem",
    systemTitle: "Tiga modul, satu lapisan keputusan",
    systemDescription:
      "FLO mengorkestrasi prediksi, routing, dan verifikasi visual pada data operasional yang sama — agar rekomendasi tetap koheren di lapangan.",
    competitionEyebrow: "Kompetisi",
    competitionTitle: "Perjalanan kompetisi",
    competitionDescription:
      "Dari proposal hingga final — jejak FLO bersama Quasarian Radr-Lyon Dynasty.",
    capabilities: [
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
    ],
    journey: [
      {
        phase: "Fase 01",
        title: "Pra-Seleksi",
        description:
          "Ideasi FLO dan proposal awal: logistik hijau & tangguh berbasis AI.",
        cta: "Lihat detail",
      },
      {
        phase: "Fase 02",
        title: "Semifinal",
        description:
          "Prototipe live dan video pitch — validasi teknis di depan juri.",
        cta: "Lihat detail",
      },
      {
        phase: "Fase 03",
        title: "Final",
        description:
          "Demo lengkap, presentasi, dan paket submission untuk babak final.",
        cta: "Lihat detail",
      },
    ],
  },
  about: {
    title: "Tentang Kami",
    headline: "Quasarian Radr-Lyon Dynasty",
    school: "SMAS Pilar Indonesia",
    provider: "Blibli",
    lede:
      "Tiga anggota dari SMAS Pilar Indonesia yang membangun FLO — sistem kecerdasan logistik untuk AI Open Innovation Challenge 2026 (Case Provider: Blibli), dengan dukungan ekosistem FabLab Jababeka dan Universitas Presiden.",
    caption: "Tim FLO di FabLab — SMAS Pilar Indonesia.",
    photoAlt:
      "Tim Quasarian Radr-Lyon Dynasty di FABLAB — Justin Raditya Rizki, Arsene Matthew E. Naftali, dan Nabiil Zhafran Alrilo Tarigan.",
    members: [
      {
        name: "Justin Raditya Rizki",
        role: "Project Lead",
        detail: "Founder of stetoradr.com",
        detailHref: "https://stetoradr.com",
        githubHref: "https://github.com/JustHackr",
      },
      {
        name: "Arsene Matthew E. Naftali",
        role: "AI Engineer",
        detail: "Founder of optivox.site",
        detailHref: "https://optivox.site",
        githubHref: "https://github.com/abckids1202",
      },
      {
        name: "Nabiil Zhafran Alrilo Tarigan",
        role: "Designer & Interface",
        detail: "Co-founder of Foodloop AI",
        detailHref: "https://foodloopai.vercel.app/",
        githubHref: "https://github.com/Belyonepic",
      },
    ],
    partnersLabel: "Afiliasi & mitra",
    presentationLink: "deck presentasi",
    packageLink: "paket final",
    seeAlso: (link1: string, link2: string) =>
      `Lihat juga ${link1} atau ${link2}.`,
  },
  preSelection: {
    eyebrow: "Fase 01 · Pra-Seleksi",
    title: "Pra-Seleksi",
    lede:
      "Pada tahap pra-seleksi, tim merumuskan masalah logistik hijau & tangguh Blibli serta menawarkan FLO sebagai orkestrator AI: prediksi risiko SLA, optimasi rute rendah karbon, dan computer vision untuk kepatuhan operasional — dengan penekanan pada Sovereign AI dan keselarasan Stranas KA, UU PDP, serta UU ITE.",
    items: [
      "Identifikasi pain point rantai pasok & janji antar",
      "Arsitektur solusi tiga modul (CV · Routing · Predictive Maintenance)",
      "Proposal tertulis untuk juri pra-seleksi",
    ],
    proposalCta: "Buka Proposal (Google Drive)",
    nextCta: "Lanjut ke Semifinal →",
  },
  semifinal: {
    eyebrow: "Fase 02 · Semifinal",
    title: "Semifinal",
    lede:
      "Babak semifinal menampilkan prototipe FLO yang dapat diakses secara live beserta video penjelasan untuk juri — bukti bahwa ide pra-seleksi sudah berjalan sebagai produk.",
    liveCta: "Buka FLO Live App",
    videoHeading: "Video pitch",
    openYoutube: "Buka di YouTube →",
    nextCta: "Lanjut ke Final →",
    backCta: "← Kembali ke Pra-Seleksi",
    videoTitle: "FLO Semifinal — Quasarian Radr-Lyon Dynasty",
  },
  final: {
    eyebrow: "Fase 03 · Final",
    title: "Final",
    lede:
      "Babak final menghadirkan demo produk, presentasi lengkap, dan paket dokumen untuk evaluasi juri.",
    resources: [
      {
        title: "Live Demo",
        description: "Coba FLO secara interaktif di lingkungan demo.",
        cta: "Buka Demo",
      },
      {
        title: "Presentasi",
        description:
          "Deck slide final di Canva untuk evaluasi juri.",
        cta: "Buka Presentasi",
      },
      {
        title: "Instal di laptop",
        description:
          "Clone main, pasang dependensi, migrasi SQLite, dan isi data demo. Langkah lengkap dari panduan instal repositori.",
        cta: "Panduan instal",
      },
      {
        title: "Kode Sumber",
        description:
          "Jelajahi repositori FLO Logistics di GitHub — kode sumber demo live di bawah JustHackr.",
        cta: "Lihat di GitHub",
      },
    ],
    install: {
      title: "Instal di laptop",
      sourceLabel: "Panduan instal di GitHub",
      sourceHref: "https://github.com/JustHackr/flo-logistics#install",
      requirementsTitle: "Kebutuhan",
      requirements: [
        ["Node.js 20+ (LTS)", "nodejs.org — installer memeriksa ini"],
        ["npm 10+", "Sudah termasuk bersama Node"],
        ["Git", "Untuk clone repositori"],
        ["OS", "macOS, Linux, atau Windows (WSL2 disarankan)"],
        ["Disk", "~500 MB untuk node_modules + SQLite"],
        ["Ollama (opsional)", "LLM lokal — ollama.com/download"],
        ["API key kompatibel OpenAI (opsional)", "LLM cloud atau self-hosted"],
        ["API key Google Maps (opsional)", "Lalu lintas live — lihat .env.example"],
      ],
      webcam:
        "Webcam hanya diperlukan untuk demo Load Detection / Hub Congestion secara live. Tur CV tetap berjalan tanpa kamera.",
      automatedTitle: "Instal otomatis (satu perintah)",
      automatedBody:
        "Meng-clone main, menulis .env.local, menjalankan npm ci, migrasi SQLite, dan mengisi data demo (Sovereign AI secara bawaan — tanpa API key).",
      ollamaTitle: "Dengan Ollama lokal (jika terpasang)",
      clonedTitle: "Repositori sudah di-clone?",
      interactiveTitle: "Instal interaktif",
      loginLead: "Lalu buka http://localhost:3000/login",
      personaHeaders: ["Persona", "Email", "Kata sandi"],
      personas: [
        ["Demo Admin", "admin@flo.demo", "demo1234"],
        ["Ops Manager", "ops@flo.demo", "demo1234"],
        ["Driver", "driver@flo.demo", "demo1234"],
        ["Warehouse", "warehouse@flo.demo", "demo1234"],
      ],
      configure:
        "Atur Ollama atau endpoint kompatibel OpenAI kapan saja di /ai/settings (Demo Admin). Pengaturan SQLite menimpa bootstrap .env.local dari installer.",
    },
    androidTitle: "Aplikasi Android (beta)",
    androidBody: "Pasang build Android FLO Logistics di ponsel atau emulator. Ini versi beta dan masih dalam pengerjaan.",
    androidCta: "Unduh APK",
    homeLink: "beranda",
    profileLink: "profil tim",
    contact: (home: string, profile: string) =>
      `Kembali ke ${home} atau lihat ${profile}.`,
  },
  presentation: {
    title: "Presentasi final",
    lede:
      "Deck Canva babak final untuk FLO — Fab Logistics Operations.",
    embedTitle: "Presentasi final FLO — Quasarian Radr-Lyon Dynasty",
    openCanva: "Buka di Canva",
  },
  footer: {
    tagline:
      "Kecerdasan logistik untuk AI Open Innovation Challenge 2026 — prediksi SLA, routing rendah karbon, dan verifikasi visual armada.",
    presentation: "Presentasi",
    liveDemo: "Live Demo",
    floApp: "FLO App",
    partnersLabel: "Mitra & afiliasi",
    partnersSentence:
      "SMAS Pilar Indonesia · Universitas Presiden · FabLab Jababeka · Blibli",
  },
} satisfies Dictionary;
