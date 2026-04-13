import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AuthGate } from "@/components/AuthGate";
import { BottomNav } from "@/components/BottomNav";
import { PageLoader } from "@/components/PageLoader";
import { OfflineIndicator } from "@/components/ui/OfflineIndicator";

export const metadata: Metadata = {
  title: "MyLevain Agro",
  description: "Intelligence agronomique terrain — Campagne 2026",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="pb-20 antialiased">
        <AuthProvider>
          <AuthGate>
            <OfflineIndicator />
            <PageLoader />
            <main className="max-w-lg mx-auto px-4 pt-6 animate-fadeIn">
              {children}
            </main>
            <BottomNav />
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
