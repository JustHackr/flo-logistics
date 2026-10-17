import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const sora = localFont({
  src: [
    { path: "../fonts/sora-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/sora-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/sora-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/sora-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

const manrope = localFont({
  src: [
    { path: "../fonts/manrope-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/manrope-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/manrope-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/manrope-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "FLO · Quasarian Radr-Lyon Dynasty",
    template: "%s · FLO",
  },
  description:
    "FLO — Fab Logistics Operations oleh Quasarian Radr-Lyon Dynasty untuk AI Open Innovation Challenge 2026 (Blibli).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${manrope.variable} h-full`}
    >
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
