import type { Metadata } from "next";
import { theme } from "../lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: theme.name,
  description: "Your best look awaits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined"
          rel="stylesheet"
        />
      </head>
      <body className="font-display bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark">
        {children}
      </body>
    </html>
  );
}
