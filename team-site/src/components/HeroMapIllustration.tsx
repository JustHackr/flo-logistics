"use client";

import { useEffect, useState } from "react";

type HeroMapIllustrationProps = {
  className?: string;
};

const ROADS = [
  "M48 390 L92 360 L140 340 L190 320 L240 300 L290 285 L340 270 L390 250 L440 225 L490 195 L530 165",
  "M60 430 L110 400 L160 380 L210 365 L260 350 L310 340 L360 325 L410 300 L460 270 L510 235",
  "M80 470 L130 445 L180 430 L230 415 L280 400 L330 385 L380 365 L430 340 L480 305 L525 270",
  "M40 330 L95 305 L145 285 L195 265 L250 250 L305 240 L360 225 L415 200 L470 175 L520 145",
  "M100 500 L150 480 L200 465 L250 450 L300 435 L350 415 L400 390 L450 360 L500 320",
  "M120 280 L170 260 L220 245 L270 235 L320 220 L370 200 L420 175 L470 150 L515 120",
  "M70 250 L120 235 L175 220 L230 210 L285 200 L340 185 L395 165 L450 140 L500 110",
  "M90 520 L140 505 L200 490 L255 470 L310 450 L365 425 L420 395 L475 355",
  "M55 360 L100 340 L150 325 L200 310 L255 295 L310 280 L365 260 L420 235 L475 205",
  "M150 540 L200 520 L255 500 L310 480 L365 455 L420 425 L475 385 L520 345",
  "M200 180 L250 170 L300 160 L350 145 L400 125 L450 100 L495 80",
  "M180 420 L230 400 L280 385 L330 365 L380 340 L430 310 L480 280",
  "M130 360 L180 345 L230 330 L280 315 L330 295 L380 275 L430 250 L480 220",
  "M220 500 L270 480 L320 460 L370 435 L420 405 L470 370 L515 330",
  "M250 220 L300 205 L350 190 L400 170 L450 145 L500 115",
  "M85 300 L135 285 L190 270 L245 255 L300 240 L355 220 L410 195 L465 165",
  "M160 460 L210 445 L265 430 L320 410 L375 385 L430 355 L485 315",
  "M110 200 L160 190 L215 180 L270 170 L325 155 L380 135 L435 110 L485 90",
  "M300 520 L350 500 L400 475 L450 445 L500 405 L540 365",
  "M65 450 L115 425 L165 405 L215 390 L265 375 L315 360 L365 340 L415 315",
  "M190 300 L240 285 L290 270 L340 250 L390 225 L440 195 L490 160",
  "M240 460 L290 440 L340 415 L390 385 L440 350 L490 310",
  "M280 160 L330 145 L380 125 L430 100 L480 75 L520 55",
  "M45 280 L95 265 L150 250 L205 240 L260 230 L315 215 L370 195 L425 170",
  "M170 540 L225 520 L280 500 L335 475 L390 445 L445 410 L500 365",
  "M320 290 L370 270 L420 245 L470 215 L520 180",
  "M95 170 L145 160 L200 150 L255 140 L310 125 L365 105 L420 85",
  "M210 360 L260 345 L310 325 L360 300 L410 270 L460 235 L510 195",
  "M140 400 L190 385 L245 370 L300 350 L355 325 L410 295 L465 260",
  "M260 400 L310 380 L360 355 L410 325 L460 290 L510 250",
];

const HUBS = [
  { id: "JP", label: "JP", x: 200, y: 310, name: "Jak-Pusat" },
  { id: "JB", label: "JB", x: 110, y: 340, name: "Jak-Bar" },
  { id: "JS", label: "JS", x: 260, y: 430, name: "Jak-Sel" },
  { id: "JT", label: "JT", x: 380, y: 280, name: "Jak-Tim" },
  { id: "JU", label: "JU", x: 300, y: 180, name: "Jak-Ut" },
] as const;

/** Optimized delivery path: Jak-Bar → Jak-Pusat → Jak-Sel → Jak-Tim → Jak-Ut */
const ROUTE_D =
  "M110 340 C 150 320, 175 315, 200 310 C 230 360, 245 400, 260 430 C 300 380, 340 320, 380 280 C 350 240, 320 205, 300 180";

export function HeroMapIllustration({ className = "" }: HeroMapIllustrationProps) {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduceMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <svg
      className={className}
      viewBox="0 0 600 600"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern
          id="hero-map-grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="0.6"
          />
        </pattern>
      </defs>

      <rect width="600" height="600" fill="url(#hero-map-grid)" />

      {/* Simplified Jakarta road network */}
      <g
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ROADS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>

      {/* Secondary corridor hints */}
      <g
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M70 360 C 140 330, 200 320, 280 300 C 360 280, 440 240, 520 180" />
        <path d="M90 480 C 180 450, 260 420, 340 370 C 420 320, 490 270, 545 220" />
      </g>

      {/* Optimized route */}
      <path
        d={ROUTE_D}
        stroke="#FFCF37"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={reduceMotion ? undefined : "8 10"}
      >
        {!reduceMotion ? (
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="-180"
            dur="3s"
            repeatCount="indefinite"
          />
        ) : null}
      </path>

      {/* Leading pulse along route end */}
      <circle cx="300" cy="180" r="6" fill="#FFCF37">
        {!reduceMotion ? (
          <animate
            attributeName="r"
            values="5;9;5"
            dur="2s"
            repeatCount="indefinite"
          />
        ) : null}
      </circle>
      <circle
        cx="300"
        cy="180"
        r="11"
        fill="none"
        stroke="#FFCF37"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      >
        {!reduceMotion ? (
          <animate
            attributeName="opacity"
            values="0.5;0.15;0.5"
            dur="2s"
            repeatCount="indefinite"
          />
        ) : null}
      </circle>

      {/* Hub markers */}
      {HUBS.map((hub) => (
        <g key={hub.id}>
          <circle
            cx={hub.x}
            cy={hub.y}
            r="5"
            fill={hub.id === "JU" ? "#FFCF37" : "#FFFFFF"}
            stroke="#0B52FF"
            strokeWidth="1.5"
          />
          <text
            x={hub.x + 10}
            y={hub.y + 4}
            fill="rgba(255,255,255,0.75)"
            fontSize="10"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            letterSpacing="0.06em"
          >
            {hub.label}
          </text>
        </g>
      ))}

      <text
        x="40"
        y="575"
        fill="rgba(255,207,55,0.7)"
        fontSize="9"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        letterSpacing="0.14em"
      >
        JAK-PUSAT · JAK-BAR · JAK-TIM · JAK-SEL · JAK-UTARA
      </text>
    </svg>
  );
}
