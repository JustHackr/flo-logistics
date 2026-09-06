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
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface/80 p-6 transition duration-300 hover:border-teal/40 hover:bg-surface-elevated"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/50 to-transparent opacity-0 transition group-hover:opacity-100" />
      <span className="text-xs font-medium tracking-[0.2em] text-teal uppercase">
        {phase}
      </span>
      <h3 className="mt-3 font-[family-name:var(--font-display)] text-xl font-semibold text-foreground">
        {title}
      </h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">
        {description}
      </p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-teal transition group-hover:gap-3">
        Lihat detail
        <span aria-hidden>→</span>
      </span>
    </Link>
  );
}
