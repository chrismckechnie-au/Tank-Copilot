import type { Metadata } from "next";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { PwaRegistration } from "@/components/pwa-registration";
import { Fraunces, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const heading = Fraunces({
  variable: "--font-heading-face",
  subsets: ["latin"],
  display: "swap",
});

const sans = Space_Grotesk({
  variable: "--font-sans-face",
  subsets: ["latin"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Tank Copilot",
  description:
    "Aquarium triage, water-test tracking, and safe report sharing for fishkeepers and aquarium professionals.",
  applicationName: "Tank Copilot",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${heading.variable} ${sans.variable} ${mono.variable} antialiased`}>
        <AnalyticsProvider>
          <PwaRegistration />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
