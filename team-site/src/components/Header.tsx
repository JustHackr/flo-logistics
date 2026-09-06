import Link from "next/link";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/about", label: "Tentang" },
  { href: "/pre-selection", label: "Pra-Seleksi" },
  { href: "/semifinal", label: "Semifinal" },
  { href: "/final", label: "Final" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-[#070f1c]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/flo-logistics/images/quasarian-mark.png"
            alt=""
            className="h-9 w-9 rounded-lg object-cover ring-1 ring-teal/30"
          />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-foreground sm:text-base">
              Quasarian Radr-Lyon Dynasty
            </span>
            <span className="text-[11px] tracking-[0.18em] text-teal uppercase">
              FLO · Logistics Intelligence
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <a
          href="/flo-logistics/demo"
          className="shrink-0 rounded-md bg-teal px-3.5 py-2 text-sm font-semibold text-navy transition hover:bg-teal-dim"
        >
          Live Demo
        </a>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto border-t border-border/50 px-4 py-2 md:hidden"
        aria-label="Navigasi mobile"
      >
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-md px-3 py-1.5 text-xs text-muted hover:bg-white/5 hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
