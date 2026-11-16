import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const arabicFont = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-sans-arabic/arabic-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ibm-plex-sans-arabic/arabic-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/ibm-plex-sans-arabic/arabic-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/ibm-plex-sans-arabic/arabic-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
});

const latinFont = localFont({
  src: [
    { path: "../public/fonts/ibm-plex-sans-arabic/latin-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/ibm-plex-sans-arabic/latin-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/ibm-plex-sans-arabic/latin-600.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/ibm-plex-sans-arabic/latin-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-arabic-latin",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://taiz-3d-printing.vercel.app"),
  title: {
    default: "Taiz 3D Printing",
    template: "%s | Taiz 3D Printing",
  },
  description: "منصة يمنية للطباعة ثلاثية الأبعاد والمنتجات حسب الطلب.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${arabicFont.variable} ${latinFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-text">{children}</body>
    </html>
  );
}
