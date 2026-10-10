import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./fonts/non-latin.css";
import { ThemeProvider } from "@/theme/ThemeContext";
import { AuthProvider } from "@/lib/useAuth";
import { I18nProvider } from "@/lib/i18n";
import { DevServiceWorkerCleanup } from "@/components/DevServiceWorkerCleanup";
import { FeedbackProvider } from "@/components/ui/feedback-provider";
import { PRICONPRI_METADATA_ICONS } from "@/lib/pwa/priconpriIcons";

const geistSans = localFont({
  src: "./fonts/geist-sans-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const outfit = localFont({
  src: "./fonts/outfit-latin.woff2",
  variable: "--font-outfit",
  weight: "400 800",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

// Font pairing fonts
const playfairDisplay = localFont({
  src: "./fonts/playfair-display-latin.woff2",
  variable: "--font-playfair-display",
  weight: "400 800",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  variable: "--font-space-grotesk",
  weight: "400 700",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const dmSans = localFont({
  src: "./fonts/dm-sans-latin.woff2",
  variable: "--font-dm-sans",
  weight: "400 700",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const bebasNeue = localFont({
  src: "./fonts/bebas-neue-latin.woff2",
  variable: "--font-bebas-neue",
  weight: "400",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const roboto = localFont({
  src: "./fonts/roboto-latin.woff2",
  variable: "--font-roboto",
  weight: "400 700",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const cormorantGaramond = localFont({
  src: "./fonts/cormorant-garamond-latin.woff2",
  variable: "--font-cormorant-garamond",
  weight: "400 700",
  display: "swap",
});

const lato = localFont({
  src: [
    { path: "./fonts/lato-400-latin.woff2", weight: "400" },
    { path: "./fonts/lato-700-latin.woff2", weight: "700" },
  ],
  variable: "--font-lato",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const nunito = localFont({
  src: "./fonts/nunito-latin.woff2",
  variable: "--font-nunito",
  weight: "400 800",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
});

const nunitoSans = localFont({
  src: "./fonts/nunito-sans-latin.woff2",
  variable: "--font-nunito-sans",
  weight: "400 700",
  display: "swap",
  declarations: [{ prop: "unicode-range", value: "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD" }],
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
