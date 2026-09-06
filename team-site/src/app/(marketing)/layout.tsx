import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-bg relative flex min-h-full flex-col">
      <div className="pointer-events-none absolute inset-0 grid-overlay" aria-hidden />
      <Header />
      <main className="relative z-10 flex-1">{children}</main>
      <Footer />
    </div>
  );
}
