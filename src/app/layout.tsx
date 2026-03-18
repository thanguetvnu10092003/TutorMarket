import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: {
    default: "TutorMarket — Premium CFA, GMAT & GRE Tutoring",
    template: "%s | TutorMarket",
  },
  description:
    "Connect with verified, world-class tutors for CFA, GMAT, and GRE exam preparation. Free trial session, personalized learning, proven results.",
  keywords: [
    "CFA tutor", "GMAT prep", "GRE tutor", "exam preparation",
    "CFA Level I", "CFA Level II", "CFA Level III",
    "GMAT tutoring", "GRE tutoring", "test prep marketplace",
  ],
  openGraph: {
    title: "TutorMarket — Premium CFA, GMAT & GRE Tutoring",
    description: "Connect with verified, world-class tutors for exam preparation.",
    url: "https://tutormarket.com",
    siteName: "TutorMarket",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-body grain-overlay min-h-screen flex flex-col">
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
