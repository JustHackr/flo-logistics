import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "yellow" | "ghost";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-blue text-white hover:bg-blue-deep border border-transparent",
  secondary:
    "bg-transparent text-ink border border-border hover:border-ink hover:bg-surface",
  yellow:
    "bg-yellow text-yellow-ink border border-transparent hover:brightness-95",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-surface-muted",
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
  external = false,
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
  external?: boolean;
}) {
  const classes = cx(
    "inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2.5 text-sm font-semibold tracking-tight transition",
    buttonStyles[variant],
    className,
  );

  if (external || href.startsWith("http") || href.startsWith("/flo-logistics/demo") || href.startsWith("/flo-logistics/downloads")) {
    return (
      <a
        href={href}
        className={classes}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  tone = "dark",
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  tone?: "dark" | "light";
}) {
  return (
    <div className="max-w-2xl">
      {eyebrow ? (
        <p
          className={cx(
            "text-[11px] font-semibold uppercase tracking-[0.18em]",
            tone === "light" ? "text-blue-soft" : "text-blue",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cx(
          "font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl",
          tone === "light" ? "text-white" : "text-ink",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cx(
            "mt-3 text-base leading-relaxed",
            tone === "light" ? "text-white/80" : "text-muted",
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: ReactNode;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue">
        {eyebrow}
      </p>
      <h1 className="font-display mt-3 text-4xl font-bold tracking-tight text-ink sm:text-5xl">
        {title}
      </h1>
      <div className="mt-4 text-base leading-relaxed text-muted sm:text-lg">
        {description}
      </div>
    </header>
  );
}

export function TextLink({
  href,
  children,
  className,
  ...props
}: ComponentProps<typeof Link>) {
  return (
    <Link
      href={href}
      className={cx(
        "font-medium text-blue underline-offset-4 transition hover:underline",
        className,
      )}
      {...props}
    >
      {children}
    </Link>
  );
}
