import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/SessionProvider";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://jyotish-two.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Free Kundli Online — Vedic Birth Chart Calculator | Jyotish",
    template: "%s | Jyotish — Free Vedic Astrology",
  },
  description:
    "Generate your free Kundli online instantly. Get accurate Vedic birth chart with planetary positions, Nakshatra, Vimshottari Dasha, Navamsa D-9, Panchang, Yogas, Transit predictions and Avakhada Chakra. Supports Lahiri, KP & Raman ayanamsha. No sign-up required.",
  keywords: [
    "free kundli", "kundali online", "free birth chart", "vedic astrology chart",
    "jyotish kundali", "free kundli online", "kundli calculator", "birth chart calculator",
    "free horoscope chart", "vedic horoscope", "nakshatra calculator", "dasha calculator",
    "navamsa chart", "panchang calculator", "lahiri ayanamsha", "free janam kundali",
    "janam kundli online", "vedic birth chart free", "astrology chart india",
    "vimshottari dasha", "yoga calculator", "transit prediction", "sidereal astrology",
    "jyotish online", "kundli software free", "rashi chart", "d9 chart",
    "avakhada chakra", "vedic horoscope free", "online jyotish calculator",
  ],
  authors: [{ name: "Jyotish" }],
  creator: "Jyotish",
  publisher: "Jyotish",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Free Kundli Online — Vedic Birth Chart Calculator",
    description:
      "Generate your free Kundli instantly. Accurate Vedic birth chart with Nakshatra, Dasha, Navamsa, Panchang, Yogas and Transit predictions. No sign-up required.",
    type: "website",
    locale: "en_IN",
    siteName: "Jyotish",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Kundli Online — Vedic Birth Chart Calculator",
    description:
      "Free Vedic birth chart with Nakshatra, Dasha, Navamsa, Panchang, Yogas & Transit predictions. No sign-up needed.",
  },
  category: "Astrology",
  classification: "Vedic Astrology Tool",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f172a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
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
