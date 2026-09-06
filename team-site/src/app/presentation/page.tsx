import type { Metadata } from "next";
import { PresentationDeck } from "@/components/PresentationDeck";

export const metadata: Metadata = {
  title: "FLO Presentation",
  description:
    "Presentation deck from Quasarian Radr-Lyon Dynasty — FLO Logistics Intelligence.",
};

export default function PresentationPage() {
  return (
    <div lang="en">
      <PresentationDeck />
    </div>
  );
}
