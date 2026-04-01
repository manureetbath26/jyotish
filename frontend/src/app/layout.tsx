import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Free Kundli Online — Vedic Birth Chart Calculator | Jyotish",
  description:
    "Generate your free Kundli online instantly. Get accurate Vedic birth chart with planetary positions, Nakshatra, Vimshottari Dasha, Navamsa D-9, Panchang, and Avakhada. Lahiri, KP & Raman ayanamsha supported.",
  keywords: [
    "free kundli", "kundali online", "free birth chart", "vedic astrology chart",
    "jyotish kundali", "free kundli online", "kundli calculator", "birth chart calculator",
    "free horoscope chart", "vedic horoscope", "nakshatra calculator", "dasha calculator",
    "navamsa chart", "panchang calculator", "lahiri ayanamsha", "free janam kundali",
    "janam kundli online", "vedic birth chart free", "astrology chart india",
  ],
  authors: [{ name: "Jyotish" }],
  robots: "index, follow",
  openGraph: {
    title: "Free Kundli Online — Vedic Birth Chart Calculator",
    description:
      "Generate your free Kundli instantly. Accurate Vedic birth chart with Nakshatra, Dasha, Navamsa, Panchang and Avakhada. No sign-up required.",
    type: "website",
    locale: "en_IN",
    siteName: "Jyotish",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Kundli Online — Vedic Birth Chart Calculator",
    description:
      "Free Vedic birth chart with Nakshatra, Dasha, Navamsa, Panchang & Avakhada. No sign-up needed.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <SessionProvider>
          <Navbar />
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
        </SessionProvider>
      </body>
    </html>
  );
}
