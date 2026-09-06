import { SiteImage } from "@/components/SiteImage";
import { PARTNERS } from "@/lib/partners";

export function PartnerRail({
  label = "Didukung oleh",
  tone = "light",
}: {
  label?: string;
  tone?: "light" | "dark" | "blue";
}) {
  const labelClass =
    tone === "blue"
      ? "text-white/70"
      : tone === "dark"
        ? "text-white/60"
        : "text-muted";

  const onDark = tone !== "light";

  return (
    <section aria-label="Partner dan afiliasi">
      <p
        className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${labelClass}`}
      >
        {label}
      </p>
      <ul className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-3 sm:gap-x-4">
        {PARTNERS.map((partner) => (
          <li key={partner.name}>
            <a
              href={partner.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`group inline-flex items-center ${
                onDark ? "rounded-sm bg-white px-3 py-2" : ""
              }`}
              title={partner.name}
            >
              <span className={`relative block ${partner.boxClass}`}>
                <SiteImage
                  src={partner.src}
                  alt={partner.alt}
                  fill
                  sizes="160px"
                  className="object-contain object-left opacity-90 transition group-hover:opacity-100"
                />
              </span>
              <span className="sr-only">{partner.name}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
