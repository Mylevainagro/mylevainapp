import type { Metadata, Viewport } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";
import { PageLoader } from "@/components/PageLoader";

export const metadata: Metadata = {
  title: "MyLevain Agro",
  description: "Suivi terrain viticulture — Campagne 2026",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#2d5016",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="MyLevain" />
      </head>
      <body className="pb-20">
        <PageLoader />
        <main className="max-w-lg mx-auto px-4 pt-4 animate-fadeIn">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
