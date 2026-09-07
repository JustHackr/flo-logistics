import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthenticatedShell } from "@/components/authenticated-shell";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionary";
import { getLocale } from "@/lib/i18n/get-locale";
import { getSession } from "@/lib/auth/session";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const dict = await getDictionary(locale);

  return {
    title: dict.meta.title,
    description: dict.meta.description,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const dict = await getDictionary(locale);
  const session = await getSession();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <LocaleProvider locale={locale} dict={dict}>
          <AuthenticatedShell user={session}>{children}</AuthenticatedShell>
        </LocaleProvider>
      </body>
    </html>
  );
}
