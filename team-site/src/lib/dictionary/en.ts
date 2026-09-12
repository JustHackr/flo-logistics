export const en = {
  common: {
    skipToContent: "Skip to content",
    liveDemo: "Live Demo",
    openMenu: "Menu",
    primaryMenu: "Primary navigation",
    mobileMenu: "Mobile navigation",
    partnersAndAffiliates: "Partners & affiliates",
  },
  nav: {
    home: "Home",
    about: "About",
    preSelection: "Pre-Selection",
    semifinal: "Semifinal",
    final: "Final",
  },
  home: {
    eyebrow: "AI Open Innovation Challenge 2026 · Case Blibli",
    headline: "One intelligence layer for every delivery.",
    ledeStrong: "FLO",
    ledeRest:
      " — Fab Logistics Operations: predictive SLA scoring, low-carbon routing, and visual fleet compliance for Blibli's supply chain.",
    builtBy: "Built by Quasarian Radr-Lyon Dynasty · SMAS Pilar Indonesia",
    primaryCta: "Open Live Demo",
    secondaryCta: "Meet the Team",
    tertiaryCta: "Presentation",
    moduleEyebrow: "01 Predict — 02 Route — 03 Verify",
    partnersLabel: "School · university · lab · case provider",
    systemEyebrow: "System",
    systemTitle: "Three modules, one decision layer",
    systemDescription:
      "FLO orchestrates prediction, routing, and visual verification on the same operational data layer — keeping recommendations coherent across the field.",
    competitionEyebrow: "Competition",
    competitionTitle: "Competition journey",
    competitionDescription:
      "From proposal to the final round — FLO's run with Quasarian Radr-Lyon Dynasty.",
    capabilities: [
      {
        code: "01",
        title: "Predict",
        body: "Real-time SLA risk scores drawn from shipping history, traffic, and hub load.",
      },
      {
        code: "02",
        title: "Route",
        body: "Multi-stop optimization that balances ETA, operational cost, and carbon footprint.",
      },
      {
        code: "03",
        title: "Verify",
        body: "Computer vision for fleet and asset compliance without a fully manual inspection.",
      },
    ],
    journey: [
      {
        phase: "Phase 01",
        title: "Pre-Selection",
        description:
          "Ideate FLO and write the initial proposal: AI-driven green & resilient logistics.",
        cta: "View details",
      },
      {
        phase: "Phase 02",
        title: "Semifinal",
        description:
          "Build the live prototype and pitch video — technical validation in front of the judges.",
        cta: "View details",
      },
      {
        phase: "Phase 03",
        title: "Final",
        description:
          "Full demo, presentation deck, and the final-round submission package.",
        cta: "View details",
      },
    ],
  },
  about: {
    title: "About Us",
    headline: "Quasarian Radr-Lyon Dynasty",
    school: "SMAS Pilar Indonesia",
    provider: "Blibli",
    lede:
      "Three members from SMAS Pilar Indonesia who built FLO — a logistics intelligence system for the AI Open Innovation Challenge 2026 (Case Provider: Blibli), supported by the FabLab Jababeka and President University ecosystem.",
    caption: "Team FLO at FabLab — SMAS Pilar Indonesia.",
    photoAlt:
      "The Quasarian Radr-Lyon Dynasty team at FABLAB — Justin Raditya Rizki, Arsene Matthew E. Naftali, and Nabiil Zhafran Alrilo Tarigan.",
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
        githubHref: "https://github.com/abckids1202",
      },
    ],
    partnersLabel: "Affiliates & partners",
    presentationLink: "presentation deck",
    packageLink: "final package",
    seeAlso: (link1: string, link2: string) =>
      `See also the ${link1} or ${link2}.`,
  },
  preSelection: {
    eyebrow: "Phase 01 · Pre-Selection",
    title: "Pre-Selection",
    lede:
      "In the pre-selection round we framed Blibli's green & resilient logistics problem and proposed FLO as the AI orchestrator: SLA risk forecasting, low-carbon route optimization, and computer vision for operational compliance — with an emphasis on Sovereign AI and alignment with Stranas KA, the Personal Data Protection Law (UU PDP), and the ITE Law.",
    items: [
      "Map the supply chain and delivery-promise pain points",
      "Three-module solution architecture (CV · Routing · Predictive Maintenance)",
      "Written proposal submitted to the pre-selection jury",
    ],
    proposalCta: "Open Proposal (Google Drive)",
    nextCta: "Continue to Semifinal →",
  },
  semifinal: {
    eyebrow: "Phase 02 · Semifinal",
    title: "Semifinal",
    lede:
      "The semifinal round showcases a live, accessible FLO prototype along with an explanatory video for the jury — proof that the pre-selection idea is already running as a product.",
    liveCta: "Open FLO Live App",
    videoHeading: "Video pitch",
    openYoutube: "Open on YouTube →",
    nextCta: "Continue to Final →",
    backCta: "← Back to Pre-Selection",
    videoTitle: "FLO Semifinal — Quasarian Radr-Lyon Dynasty",
  },
  final: {
    eyebrow: "Phase 03 · Final",
    title: "Final",
    lede:
      "The final round delivers the product demo, full presentation, and a complete document package for jury evaluation.",
    resources: [
      {
        title: "Live Demo",
        description: "Try FLO interactively in the demo environment.",
        cta: "Open Demo",
      },
      {
        title: "Presentation",
        description:
          "Final slide deck — keyboard navigation, ready to export to PDF.",
        cta: "Open Presentation",
      },
      {
        title: "Download Package",
        description:
          "Install FLO Logistics on your machine — a local Node + SQLite package you can run offline when it ships.",
        cta: "Coming soon",
      },
      {
        title: "Source Code",
        description:
          "Browse the FLO Logistics repository on GitHub — the live demo source under JustHackr.",
        cta: "View on GitHub",
      },
    ],
    homeLink: "homepage",
    profileLink: "team profile",
    contact: (home: string, profile: string) =>
      `Return to the ${home} or view the ${profile}.`,
  },
  footer: {
    tagline:
      "Logistics intelligence for the AI Open Innovation Challenge 2026 — predictive SLA, low-carbon routing, and visual fleet compliance.",
    presentation: "Presentation",
    liveDemo: "Live Demo",
    floApp: "FLO App",
    partnersLabel: "Partners & affiliates",
    partnersSentence:
      "SMAS Pilar Indonesia · President University · FabLab Jababeka · Blibli",
  },
};
