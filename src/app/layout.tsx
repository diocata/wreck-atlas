import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Wreck Atlas", description: "An educational prototype for exploring documented shipwrecks." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
