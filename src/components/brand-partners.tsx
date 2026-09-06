"use client";

import Image from "next/image";
import { useI18n } from "@/components/i18n/use-i18n";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

const PARTNERS = [
  {
    src: "/brand/garuda.png",
    alt: "Garuda Pancasila",
    box: "h-9 w-10",
  },
  {
    src: "/brand/blibli.png",
    alt: "Blibli",
    box: "h-8 w-14",
  },
  {
    src: "/brand/fablab.png",
    alt: "FabLab",
    box: "h-8 w-14",
  },
] as const;

/**
 * Garuda · Blibli · FabLab — compact partner cluster for the top bar.
 */
export function BrandPartners({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        "min-w-0 max-w-full overflow-hidden",
        showLabel && "space-y-1.5",
        className
      )}
    >
      {showLabel && (
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/70">
          {t("common.partners")}
        </p>
      )}
      <div
        className="flex max-w-full items-center justify-end gap-2.5 sm:gap-3"
        role="group"
        aria-label={t("common.partnersAria")}
      >
        {PARTNERS.map((partner, index) => (
          <span
            key={partner.src}
            className="flex min-w-0 items-center gap-2.5 sm:gap-3"
          >
            {index > 0 && (
              <span
                aria-hidden
                className="h-6 w-px shrink-0 bg-primary/20"
              />
            )}
            <span
              className={cn(
                "relative shrink-0 overflow-hidden rounded-sm",
                partner.box
              )}
            >
              <Image
                src={withBasePath(partner.src)}
                alt={partner.alt}
                fill
                sizes="80px"
                className="object-contain object-center"
                priority
              />
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
