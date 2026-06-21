import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import {
  Outfit,
  Playfair_Display,
  Inter,
  Space_Grotesk,
  DM_Sans,
  Bebas_Neue,
  Roboto,
  Cormorant_Garamond,
  Lato,
  Nunito,
  Nunito_Sans,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/theme/ThemeContext";
import { AuthProvider } from "@/lib/useAuth";
import { I18nProvider } from "@/lib/i18n";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { PRICONPRI_METADATA_ICONS } from "@/lib/pwa/priconpriIcons";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Font pairing fonts
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  variable: "--font-nunito-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PriConPri",
  description:
    "Find and book the best barbers, stylists, and beauty professionals near you with PriConPri.",
  other: {
    "google": "notranslate",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PriConPri",
  },
  icons: PRICONPRI_METADATA_ICONS,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e73886",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      translate="no"
      suppressHydrationWarning
      className={`notranslate ${geistSans.variable} ${geistMono.variable} ${outfit.variable} ${playfairDisplay.variable} ${inter.variable} ${spaceGrotesk.variable} ${dmSans.variable} ${bebasNeue.variable} ${roboto.variable} ${cormorantGaramond.variable} ${lato.variable} ${nunito.variable} ${nunitoSans.variable}`}
    >
      <body className="app-shell antialiased">
        <DevServiceWorkerCleanup />
        <ThemeProvider>
          <I18nProvider>
            <AuthProvider>
              <FeedbackProvider>{children}</FeedbackProvider>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
