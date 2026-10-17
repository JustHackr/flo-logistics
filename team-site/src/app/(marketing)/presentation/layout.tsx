import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FLO Presentation",
  description:
    "Final Canva presentation from Quasarian Radr-Lyon Dynasty — FLO Logistics Intelligence.",
};

export default function PresentationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
