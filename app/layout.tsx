import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerCleanup from "@/components/ServiceWorkerCleanup";

export const metadata: Metadata = {
  title: "Student Performance System - AI-Powered Analytics",
  description: "AI-Powered Student Performance Analysis and Management System for schools. Track assessments, generate insights, and improve student outcomes.",
  keywords: ["student management", "performance tracking", "AI analytics", "school management", "education technology"],
  authors: [{ name: "Student Performance System" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SPS",
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SPS" />
      </head>
      <body className="antialiased">
        <ServiceWorkerCleanup />
        {children}
      </body>
    </html>
  );
}
