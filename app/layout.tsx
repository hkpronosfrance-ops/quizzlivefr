import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuizzLiveFR",
  description: "Overlay quiz en direct pour TikTok Live",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&family=Space+Mono:wght@700&family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
