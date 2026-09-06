import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-shell relative flex min-h-full flex-col">
      <Header />
      <main id="main-content" className="relative z-10 flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
