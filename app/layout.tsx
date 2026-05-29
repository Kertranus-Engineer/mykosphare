import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MYKOSPHARE",
    template: "%s · MYKOSPHARE",
  },
  description:
    "Environmental Intelligence Platform — realtime environmental automation, vision-assisted monitoring, and intelligent telemetry infrastructure for controlled environment agriculture and industrial biotech.",
  openGraph: {
    title: "MYKOSPHARE",
    description:
      "Environmental Intelligence Platform — industrial biotech telemetry and automation.",
    url: "https://mykosphare.vercel.app",
    siteName: "MYKOSPHARE",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MYKOSPHARE",
    description:
      "Environmental Intelligence Platform — industrial biotech telemetry and automation.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      data-theme="obsidian"
      suppressHydrationWarning
    >
      <body className="min-h-full"><Providers>{children}</Providers></body>
    </html>
  );
}
