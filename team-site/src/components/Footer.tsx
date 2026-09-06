import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-navy/60">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <p className="font-[family-name:var(--font-display)] text-sm font-medium text-foreground">
            Quasarian Radr-Lyon Dynasty
          </p>
          <p className="mt-1 text-xs text-muted">
            SMAS Pilar Indonesia · AI Open Innovation Challenge 2026 · Blibli
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <Link href="/presentation" className="hover:text-teal">
            Presentasi
          </Link>
          <a href="/flo-logistics/demo" className="hover:text-teal">
            Live Demo
          </a>
          <a
            href="https://flo-logistics.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-teal"
          >
            FLO App
          </a>
        </div>
      </div>
    </footer>
  );
}
