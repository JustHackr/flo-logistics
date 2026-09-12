"use client";

import { useEffect, useState } from "react";
import { SectionHeading } from "@/components/ui";

export type SystemSlide = {
  title: string;
  description: string;
  capabilities: Array<{
    code: string;
    title: string;
    body: string;
  }>;
};

const AUTO_MS = 6500;

export function SystemCarousel({
  eyebrow,
  slides,
}: {
  eyebrow: string;
  slides: SystemSlide[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = slides.length;
  const slide = slides[index] ?? slides[0];

  useEffect(() => {
    if (paused || total < 2) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, total]);

  if (!slide) return null;

  const cols =
    slide.capabilities.length >= 3
      ? "lg:grid-cols-3"
      : slide.capabilities.length === 2
        ? "sm:grid-cols-2"
        : "";

  return (
    <section
      className="px-4 py-16 sm:px-6 sm:py-20"
      aria-roledescription="carousel"
      aria-label={eyebrow}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setPaused(false);
        }
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div
          key={slide.title}
          className="animate-fade-up"
          aria-live="polite"
        >
          <SectionHeading
            eyebrow={eyebrow}
            title={slide.title}
            description={slide.description}
          />
          <div className={`mt-10 grid gap-4 ${cols}`}>
            {slide.capabilities.map((item) => (
              <article
                key={item.code}
                className="border border-border bg-surface p-6"
              >
                <p className="font-mono text-xs font-semibold tracking-[0.16em] text-blue">
                  {item.code}
                </p>
                <h3 className="font-display mt-3 text-2xl font-bold text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>

        {total > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-3">
            {slides.map((s, i) => (
              <button
                key={s.title}
                type="button"
                aria-label={`Show slide ${i + 1}: ${s.title}`}
                aria-current={i === index ? "true" : undefined}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === index ? "bg-blue" : "bg-border hover:bg-muted"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
