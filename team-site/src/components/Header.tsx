"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SiteImage } from "@/components/SiteImage";

const navLinks = [
  { href: "/", label: "Beranda" },
  { href: "/about", label: "Tentang" },
  { href: "/pre-selection", label: "Pra-Seleksi" },
  { href: "/semifinal", label: "Semifinal" },
  { href: "/final", label: "Final" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-[#f7f9fc]/92 backdrop-blur-md">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-yellow focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-yellow-ink"
      >
        Lewati ke konten
      </a>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
            <SiteImage
              src="/images/quasarian-mark.png"
              alt="Quasarian Radr-Lyon Dynasty"
              fill
              sizes="36px"
              className="object-cover"
              priority
            />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="font-display truncate text-sm font-bold tracking-tight text-ink sm:text-base">
              FLO
            </span>
            <span className="truncate text-[11px] font-medium tracking-[0.12em] text-muted uppercase">
              Fab Logistics Operations
            </span>
          </span>
        </Link>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Navigasi utama"
        >
          {navLinks.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-sm px-3 py-2 text-sm transition ${
                  active
                    ? "bg-blue-soft font-semibold text-blue"
                    : "text-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href="/flo-logistics/demo"
            className="shrink-0 rounded-sm bg-blue px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-blue-deep"
          >
            Live Demo
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-border text-ink md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">Menu</span>
            <span aria-hidden className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
              <span className="block h-0.5 w-4 bg-ink" />
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <nav
          id="mobile-nav"
          className="border-t border-border bg-surface px-4 py-3 md:hidden"
          aria-label="Navigasi mobile"
        >
          <ul className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                    className={`block rounded-sm px-3 py-2.5 text-sm ${
                      active
                        ? "bg-blue-soft font-semibold text-blue"
                        : "text-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
