import Link from "next/link";
import { PartnerRail } from "@/components/PartnerRail";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-navy text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">
              FLO · Quasarian Radr-Lyon Dynasty
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
              Kecerdasan logistik untuk AI Open Innovation Challenge 2026 —
              prediksi SLA, routing rendah karbon, dan verifikasi visual armada.
            </p>
            <div className="mt-6 flex flex-wrap gap-4 text-sm text-white/75">
              <Link href="/presentation" className="hover:text-yellow">
                Presentasi
              </Link>
              <a href="/flo-logistics/demo" className="hover:text-yellow">
                Live Demo
              </a>
              <a
                href="https://flo-logistics.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-yellow"
              >
                FLO App
              </a>
            </div>
          </div>
          <PartnerRail label="Mitra & afiliasi" tone="dark" />
        </div>
        <p className="mt-8 border-t border-white/10 pt-5 text-xs text-white/50">
          SMAS Pilar Indonesia · Universitas Presiden · FabLab Jababeka · Blibli
        </p>
      </div>
    </footer>
  );
}
