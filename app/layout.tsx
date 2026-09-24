import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HelpLineButton from "@/components/HelpLineButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pocket Money Home",
  description:
    "Pocket Money Home — Work, Learn & Earn",

  icons: {
    icon: [
      {
        url: "/icon.png",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    title: "Pocket Money Home",
    description: "Work, Learn & Earn with Pocket Money Home",
    url: "https://pocket-money.vercel.app",
    siteName: "Pocket Money Home",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Pocket Money Home",
      },
    ],
    locale: "bn_BD",
    type: "website",
  },

  twitter: {
    card: "summary_large_image",
    title: "Pocket Money Home",
    description: "Work, Learn & Earn with Pocket Money Home",
    images: ["/og-image.png"],
  },

  appleWebApp: {
    capable: true,
    title: "Pocket Money Home",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bn"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <HelpLineButton />
      </body>
    </html>
  );
}