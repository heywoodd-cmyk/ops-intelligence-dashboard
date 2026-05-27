import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Operations Brief",
  description:
    "Adaptive operational brief — bottlenecks, overdue patterns, and workload at a glance.",
};

// If Geist ever fails to fetch in dev, swap the two imports above for:
//   import { Inter, JetBrains_Mono } from "next/font/google";
//   const sans = Inter({ ... }); const mono = JetBrains_Mono({ ... });
// One attempt on Geist, then fall back — per the refactor spec.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-primary font-sans">
        {children}
      </body>
    </html>
  );
}
