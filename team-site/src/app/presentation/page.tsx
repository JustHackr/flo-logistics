import type { Metadata } from "next";
import { PresentationDeck } from "@/components/PresentationDeck";

export const metadata: Metadata = {
  title: "Presentasi FLO",
  description:
    "Slide deck final Quasarian Radr-Lyon Dynasty — FLO Logistics Intelligence.",
};

export default function PresentationPage() {
  return <PresentationDeck />;
}
