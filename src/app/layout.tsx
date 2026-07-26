import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wreck Atlas — Interactive Global Shipwreck Map",
  description: "Explore 102,000+ documented shipwrecks worldwide on an interactive tactical sonar map. Discover historical maritime data, sinking eras, and vessel details.",
  openGraph: {
    title: "Wreck Atlas — Interactive Global Shipwreck Map",
    description: "Explore 102,000+ documented shipwrecks worldwide on an interactive tactical sonar map. Discover historical maritime data, sinking eras, and vessel details.",
    type: "website",
    siteName: "Wreck Atlas",
  },
  twitter: {
    card: "summary_large_image",
    title: "Wreck Atlas — Interactive Global Shipwreck Map",
    description: "Explore 102,000+ documented shipwrecks worldwide on an interactive tactical sonar map. Discover historical maritime data, sinking eras, and vessel details.",
  },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
