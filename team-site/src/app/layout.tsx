import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Quasarian Radr-Lyon Dynasty · FLO",
    template: "%s · Quasarian Radr-Lyon Dynasty",
  },
  description:
    "Tim Quasarian Radr-Lyon Dynasty — FLO untuk AI Open Innovation Challenge 2026 (Blibli).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${sora.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
