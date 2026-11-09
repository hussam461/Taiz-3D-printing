import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const arabicFont = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Taiz 3D Printing",
    template: "%s | Taiz 3D Printing",
  },
  description: "منصة يمنية للطباعة ثلاثية الأبعاد والمنتجات حسب الطلب.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className={`${arabicFont.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-bg font-sans text-text">{children}</body>
    </html>
  );
}
