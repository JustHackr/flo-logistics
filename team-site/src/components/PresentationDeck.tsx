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

function PartnerLogoStrip() {
  return (
    <ul
      className="flex w-full max-w-5xl flex-wrap items-center justify-center gap-x-4 gap-y-2"
      aria-label="Partners and affiliates"
    >
      {PARTNERS.map((partner) => (
        <li key={partner.name}>
          <a
            href={partner.href}
            target="_blank"
            rel="noopener noreferrer"
            title={partner.name}
            className="inline-flex items-center"
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
          </a>
        </li>
      ))}
    </ul>
  );
}

type FeatureMedia = {
  src: string;
  alt: string;
  label?: string;
};

function FeatureShot({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="relative aspect-[16/10] w-full overflow-hidden border border-border bg-surface shadow-sm">
      <SiteImage
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, 560px"
        className="object-cover object-top"
        unoptimized
      />
    </div>
  );
}

function FeatureGallery({ shots }: { shots: FeatureMedia[] }) {
  const [index, setIndex] = useState(0);
  const current = shots[index] ?? shots[0];
  if (!current) return null;

  return (
    <div className="w-full space-y-2">
      {shots.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Computer vision demos">
          {shots.map((shot, i) => (
            <button
              key={shot.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              onClick={() => setIndex(i)}
              className={`rounded-sm border px-2.5 py-1 text-xs font-semibold transition sm:text-sm ${
                i === index
                  ? "border-blue bg-blue text-white"
                  : "border-border bg-surface text-muted hover:text-ink"
              }`}
            >
              {shot.label ?? `Clip ${i + 1}`}
            </button>
          ))}
        </div>
      ) : null}
      <FeatureShot src={current.src} alt={current.alt} />
    </div>
  );
}

function FeatureSplit({
  shot,
  shots,
  children,
}: {
  shot?: FeatureMedia;
  shots?: FeatureMedia[];
  children: ReactNode;
}) {
  const gallery = shots ?? (shot ? [shot] : []);
  return (
    <div className="grid w-full max-w-5xl items-center gap-5 text-left lg:grid-cols-2 lg:gap-8">
      <div className="space-y-3 text-sm leading-relaxed text-muted sm:text-base">
        {children}
      </div>
      <FeatureGallery shots={gallery} />
    </div>
  );
}

const slides: Slide[] = [
  {
    id: "team",
    eyebrow: "AI Open Innovation Challenge 2026",
    title: "Team introduction",
    body: (
      <div className="flex w-full max-w-5xl flex-col gap-5">
        <figure className="overflow-hidden border border-border bg-surface">
          <div className="relative aspect-[16/9] w-full max-h-[38vh]">
            <SiteImage
              src="/images/team-fablab.png"
              alt="Quasarian Radr-Lyon Dynasty at FabLab — Justin Raditya Rizki, Arsene Matthew E. Naftali, and Nabiil Zhafran Alrilo Tarigan"
              fill
              sizes="(max-width: 768px) 100vw, 1024px"
              className="object-cover object-center"
              priority
            />
          </div>
        </figure>
        <div className="grid gap-3 text-left sm:grid-cols-3">
          {[
            {
              name: "Justin Raditya Rizki",
              role: "Project Lead",
              detail: "stetoradr.com",
              href: "https://stetoradr.com",
              githubHref: "https://github.com/JustHackr",
            },
            {
              name: "Arsene Matthew E. Naftali",
              role: "AI Engineer",
              detail: "optivox.site",
              href: "https://optivox.site",
              githubHref: "https://github.com/abckids1202",
            },
            {
              name: "Nabiil Zhafran Alrilo Tarigan",
              role: "Designer & Interface",
              detail: "foodloopai.vercel.app",
              href: "https://foodloopai.vercel.app/",
              githubHref: "https://github.com/Belyonepic",
            },
          ].map((m) => (
            <div key={m.name} className="border border-border bg-surface p-3 sm:p-4">
              <h3 className="font-display text-sm font-bold text-ink sm:text-base">
                {m.name}
              </h3>
              <p className="mt-1 text-xs text-blue sm:text-sm">{m.role}</p>
              <a
                href={m.href}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-block text-xs text-muted underline decoration-border underline-offset-4 hover:text-blue sm:text-sm"
              >
                {m.detail}
              </a>
              {m.githubHref ? (
                <a
                  href={m.githubHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 block text-xs text-muted underline decoration-border underline-offset-4 hover:text-blue sm:text-sm"
                >
                  GitHub
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "usecase",
    eyebrow: "Case · Blibli",
    title: "Jakarta last-mile, three walls at once",
    body: (
      <ul className="max-w-3xl space-y-4 text-left text-base leading-relaxed text-muted sm:text-lg">
        {[
          "SLA risk is opaque — which vehicles will miss a maintenance window before peak day?",
          "Routing cost and carbon climb with Jakarta congestion; plans still need fuel and CO₂ in the same decision.",
          "Compliance is still manual — dock load checks and hub dwell still depend on humans watching cameras.",
        ].map((item) => (
          <li key={item} className="border-l-4 border-blue pl-4">
            {item}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: "exec",
    eyebrow: "Executive summary",
    title: "The problem FLO is solving",
    body: (
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <p className="text-lg text-muted sm:text-xl">
          One intelligence layer for every delivery — a last-mile ops cockpit
          that stays on the operator&apos;s machine, not a foreign cloud.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              t: "01 Predict",
              d: "Score fleet health (VQI) and the next service window before a truck fails the SLA.",
            },
            {
              t: "02 Route",
              d: "Assign orders for time, fuel, and carbon — Jakarta traffic-aware, not a generic map.",
            },
            {
              t: "03 Verify",
              d: "Computer vision on the warehouse device so camera frames never become a leak.",
            },
          ].map((m) => (
            <div key={m.t} className="border border-border bg-surface p-5 text-left">
              <h3 className="font-display text-lg font-bold text-blue">{m.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{m.d}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: "architecture",
    eyebrow: "Architecture",
    title: "AI ontology, connectors, process",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/07-process-map.png",
          alt: "FLO admin process map swimlane with live stats",
        }}
      >
        <p>
          FLO models operations as a typed process graph — lanes for Fleet,
          Routing, Warehouse, Assistant, and Platform — then wires live data
          through connectors instead of one-off glue code.
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {["Fleet", "Routing", "Warehouse", "Assistant", "Platform"].map(
            (lane) => (
              <div
                key={lane}
                className="border border-border bg-surface px-1 py-2 text-center"
              >
                <p className="text-[10px] font-semibold text-ink sm:text-xs">
                  {lane}
                </p>
              </div>
            ),
          )}
        </div>
        <p>
          Planned connectors: IoT · Telematics · Nightly CSV · OMS · WMS. Flo
          Designer overlays a new process onto this ontology.
        </p>
      </FeatureSplit>
    ),
  },
  {
    id: "routing",
    eyebrow: "02 Route",
    title: "Routing optimization",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/03-routing-plan.png",
          alt: "FLO logistics live route monitor dashboard",
        }}
      >
        <p>
          Plans balance ETA, fuel, and carbon for Greater Jakarta — not a
          generic TSP. OSRM plus a Jakarta rush-hour model; Google Maps is
          optional, never required.
        </p>
        <ul className="space-y-2">
          <li>• Multi-stop capacity and driver–vehicle matching</li>
          <li>• Delivery Time Index (DTI) per stop</li>
          <li>• Fuel cost + Carbon Footprint Index (CFI) on every plan</li>
        </ul>
      </FeatureSplit>
    ),
  },
  {
    id: "predict",
    eyebrow: "01 Predict",
    title: "Predictive maintenance",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/04-fleet-vehicles.png",
          alt: "FLO fleet vehicles list with VQI risk badges",
        }}
      >
        <p>
          Vehicle Quality Index (VQI) is a hand-rolled health score — not a
          black-box cloud model — so ops can see why a unit is high-risk.
        </p>
        <ul className="space-y-2">
          <li>• Weights: age 30 · odometer 30 · cost 20 · planning 20</li>
          <li>• Engine modifiers for EV, gasoline, and diesel</li>
          <li>• 90-day cost window; pluggable predictor for a later ML swap</li>
        </ul>
      </FeatureSplit>
    ),
  },
  {
    id: "cv",
    eyebrow: "03 Verify",
    title: "Computer vision in the warehouse",
    body: (
      <FeatureSplit
        shots={[
          {
            src: "/screenshots/load-detection.gif",
            alt: "FLO load detection live session counting kraft cartons through a bag opening",
            label: "Load Detection",
          },
          {
            src: "/screenshots/hub-congestion.gif",
            alt: "FLO hub congestion live session tracking dock occupancy",
            label: "Hub Congestion",
          },
        ]}
      >
        <p>
          Inference runs in the browser MediaStream. Frames stay on the dock
          tablet — they are never uploaded to train someone else&apos;s model.
        </p>
        <ul className="space-y-2">
          <li>• Load detection — kraft cartons through a bag opening</li>
          <li>• Hub congestion / dwell on a yellow platform</li>
          <li>• ODOL placeholder + a no-webcam tour for judges</li>
        </ul>
      </FeatureSplit>
    ),
  },
  {
    id: "command",
    eyebrow: "Command center",
    title: "See the whole operation",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/02-home.png",
          alt: "FLO home command center dashboard with routes and fleet signals",
        }}
      >
        <p>
          Home and logistics dashboards pull one SQLite store: route progress,
          fleet VQI, and units that need attention.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { t: "Live routes", d: "ETA, fuel, emissions" },
            { t: "Fleet VQI", d: "High-risk before peak" },
            { t: "Carbon (CFI)", d: "vs diesel & EV" },
          ].map((c) => (
            <div key={c.t} className="border border-border bg-surface p-3">
              <h3 className="font-display text-sm font-bold text-blue">{c.t}</h3>
              <p className="mt-1 text-xs text-muted">{c.d}</p>
            </div>
          ))}
        </div>
        <div className="border border-blue/30 bg-blue-soft/50 p-3 font-mono text-[11px] sm:text-xs">
          <p className="font-semibold text-ink">Carbon Footprint Index</p>
          <p className="mt-1 text-muted">
            CFI = 100 × (dieselKg − actualKg) / (dieselKg − evKg)
          </p>
          <p className="mt-1 text-muted">
            kg CO₂/km — EV 0.05 · gasoline 0.15 · diesel 0.22
          </p>
        </div>
      </FeatureSplit>
    ),
  },
  {
    id: "whats-new",
    eyebrow: "Final round",
    title: "What’s new in final",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/01-login.png",
          alt: "FLO role-based demo login with persona cards",
        }}
      >
        <ul className="space-y-2">
          {[
            "Flo Designer — prompt a graph, save in SQLite, export JSON",
            "Admin process map — drag nodes, permanent detail pane",
            "Role-based login and workflow tours",
            "On-device CV tour; Sovereign AI posture page",
            "Command-center home with CFI / DTI on one loop",
          ].map((item) => (
            <li key={item} className="border-l-4 border-blue pl-3">
              {item}
            </li>
          ))}
        </ul>
      </FeatureSplit>
    ),
  },
  {
    id: "designer",
    eyebrow: "Flo Designer",
    title: "Plan integrations without writing code first",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/flo-designer.gif",
          alt: "FLO Designer canvas generating a process graph from a prompt",
        }}
      >
        <p>
          Mentors and operators kept asking: how does FLO wire into a warehouse
          with no WMS, a nightly CSV hub, or a telematics vendor with no public
          API? Integration planning was the bottleneck.
        </p>
        <p>
          Flo Designer: plain language → validated graph → overlay on FLO&apos;s
          process map → save → export JSON.
        </p>
      </FeatureSplit>
    ),
  },
  {
    id: "sovereign",
    eyebrow: "Sovereign AI",
    title: "Local-first, aligned with Indonesian law",
    body: (
      <FeatureSplit
        shot={{
          src: "/screenshots/08-sovereign-ai.png",
          alt: "FLO Sovereign AI posture page",
        }}
      >
        <blockquote className="border-l-4 border-blue pl-3 text-base text-ink sm:text-lg">
          “Prompts never leave the deployment by default.”
        </blockquote>
        <p>
          FLO is self-hostable: SQLite on the operator&apos;s machine, RBAC, no
          third-party telemetry. Opt-in open-weight LLM only when you choose.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              t: "Stranas KA",
              d: "Talent, infrastructure, ethics — Visi Emas 2045.",
            },
            {
              t: "UU PDP 27/2022",
              d: "Personal data residency and limited processing.",
            },
            {
              t: "UU ITE 1/2024",
              d: "Audit-friendly APIs; opt-in outbound LLM.",
            },
          ].map((item) => (
            <div key={item.t} className="border border-blue/30 bg-blue-soft/50 p-3">
              <h3 className="font-display text-sm font-bold text-blue">{item.t}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted">{item.d}</p>
            </div>
          ))}
        </div>
      </FeatureSplit>
    ),
  },
  {
    id: "local-ai",
    eyebrow: "Vision",
    title: "FLO for local Indonesia AI",
    body: (
      <div className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <p>
          A high-school team, a FabLab, a university partner, and an Indonesian
          case. The product is meant to run on a laptop or a VPS in-country —
          no model weights required to start, open-weight LLMs when you opt in.
        </p>
        <p>
          Local talent should be able to inspect, fork, and extend the
          ontology — not wait for a foreign vendor roadmap.
        </p>
      </div>
    ),
  },
  {
    id: "deserve",
    eyebrow: "Why not off-the-shelf",
    title: "Indonesia deserves software that understands here",
    body: (
      <div className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <p>
          You can grab many off-the-shelf routing, fleet, and CV products.
          They were not designed for Jabodetabek traffic, Pertamina fuel,
          ODOL, or UU PDP.
        </p>
        <p className="font-semibold text-ink">
          Indonesia deserves something that understands local needs, built by
          locals.
        </p>
      </div>
    ),
  },
  {
    id: "marathon",
    eyebrow: "Roadmap",
    title: "A marathon, not a sprint",
    body: (
      <ol className="max-w-3xl space-y-4 text-left text-base text-muted sm:text-lg">
        <li>
          <span className="font-semibold text-ink">Pilot.</span> One hub:
          VQI + command center + a handful of routes.
        </li>
        <li>
          <span className="font-semibold text-ink">Scale.</span> Multi-hub
          carbon routing and on-device CV at the dock.
        </li>
        <li>
          <span className="font-semibold text-ink">Platform.</span> Connectors
          and Flo Designer as the way new systems join without a rewrite.
        </li>
        <li>It might take time. That is the honest path — not a demo-night miracle.</li>
      </ol>
    ),
  },
  {
    id: "thanks",
    eyebrow: "Thank you",
    title: "Thank you",
    body: (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <p className="text-lg text-muted">
          Quasarian Radr-Lyon Dynasty · FLO — Fab Logistics Operations
        </p>
        <p className="text-sm text-muted">
          Live demo: radr.nxtdev.xyz/flo-logistics/demo/login
          <br />
          Source: github.com/JustHackr/flo-logistics
        </p>
        <p className="text-sm text-muted">Print this deck to PDF · Arrow keys to navigate</p>
      </div>
    ),
  },
  {
    id: "qa",
    eyebrow: "Discussion",
    title: "Q&A",
    body: (
      <p className="max-w-xl text-lg text-muted sm:text-xl">
        Questions, challenges, and ideas — we are here for them.
      </p>
    ),
  },
];

function SlideFrame({ slide }: { slide: Slide }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col items-center text-center">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        {slide.eyebrow ? (
          <p className="mb-3 text-[11px] font-semibold tracking-[0.18em] text-blue uppercase">
            {slide.eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl md:text-4xl">
          {slide.title}
        </h1>
        <div className="mt-5 flex w-full justify-center">{slide.body}</div>
      </div>
      <div className="mt-6 shrink-0 pb-2">
        <PartnerLogoStrip />
      </div>
    </div>
  );
}

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
          ← Back to site
        </a>
        <p className="hidden text-xs text-muted sm:block">
          ← → to navigate · Print for PDF
        </p>
        <p className="font-mono text-xs font-semibold text-blue">
          {index + 1} / {total}
        </p>
      </div>

      <div className="print:hidden relative flex min-h-screen items-center justify-center px-6 pt-16 pb-28">
        {slides.map((slide, i) => (
          <section
            key={slide.id}
            className={`presentation-slide absolute inset-0 flex flex-col items-center px-6 pt-16 pb-28 transition-opacity duration-300 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            <SlideFrame slide={slide} />
          </section>
        ))}
      </div>

      <div className="hidden print:block">
        {slides.map((slide) => (
          <section
            key={`print-${slide.id}`}
            className="presentation-slide flex flex-col items-center justify-center px-12 py-10"
          >
            <SlideFrame slide={slide} />
          </section>
        ))}
      </div>

      <div className="no-print fixed right-0 bottom-0 left-0 z-20 flex items-center justify-center gap-3 border-t border-border bg-surface/95 px-4 py-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          className="min-h-11 rounded-sm border border-border px-4 py-2.5 text-sm font-medium text-muted hover:border-ink hover:text-ink"
        >
          Previous
        </button>
        <div className="flex gap-1.5">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Slide ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => go(i)}
              className={`h-2.5 w-2.5 rounded-full transition ${
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
          Next
        </button>
      </div>
    </div>
  );
}
