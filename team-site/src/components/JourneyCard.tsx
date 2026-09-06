import Link from "next/link";

type JourneyCardProps = {
  phase: string;
  title: string;
  description: string;
  href: string;
  index: number;
};

export function JourneyCard({
  phase,
  title,
  description,
  href,
  index,
}: JourneyCardProps) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col border border-border bg-surface p-6 transition hover:border-blue hover:bg-blue-soft/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-xs font-semibold tracking-[0.14em] text-blue uppercase">
          {phase}
        </span>
        <span className="font-mono text-xs text-muted">0{index + 1}</span>
      </div>
      <h3 className="font-display mt-4 text-xl font-bold tracking-tight text-ink">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
        {description}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue transition group-hover:gap-3">
        Lihat detail
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
