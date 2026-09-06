import type { Metadata } from "next";
import { Avatar } from "@/components/Avatar";

export const metadata: Metadata = {
  title: "Tentang Kami",
};

const members = [
  {
    name: "Justin Raditya Rizki",
    role: "Project Lead",
    detail: "Founder of stetoradr.com",
    href: "https://stetoradr.com",
    initials: "JR",
    gradient: "linear-gradient(135deg, #3b4fd9 0%, #14b8a6 100%)",
  },
  {
    name: "Arsene Matthew E. Naftali",
    role: "AI Engineer",
    detail: "Founder of optivox.site",
    href: "https://optivox.site",
    initials: "AM",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
  },
  {
    name: "Nabiil Zhafran Alrilo Tarigan",
    role: "Designer & Interface",
    detail: "Co-founder of Foodloop AI",
    href: null,
    initials: "NZ",
    gradient: "linear-gradient(135deg, #14b8a6 0%, #0f766e 55%, #312e81 100%)",
  },
];

export default function AboutPage() {
  return (
    <div className="px-4 py-16 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-medium tracking-[0.25em] text-teal uppercase">
          Tentang Kami
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          Quasarian Radr-Lyon Dynasty
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Tiga anggota dari{" "}
          <span className="text-foreground">SMAS Pilar Indonesia</span> yang
          membangun FLO — sistem kecerdasan logistik untuk AI Open Innovation
          Challenge 2026 (Case Provider: Blibli).
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <article
              key={m.name}
              className="flex flex-col items-start rounded-xl border border-border bg-surface/70 p-6"
            >
              <Avatar initials={m.initials} gradient={m.gradient} />
              <h2 className="mt-5 font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
                {m.name}
              </h2>
              <p className="mt-1 text-sm font-medium text-teal">{m.role}</p>
              {m.href ? (
                <a
                  href={m.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-sm text-muted underline-offset-4 transition hover:text-foreground hover:underline"
                >
                  {m.detail}
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">{m.detail}</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
