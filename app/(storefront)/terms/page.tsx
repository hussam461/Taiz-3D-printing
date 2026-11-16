import type { Metadata } from "next";
import LegalRoute from "@/components/storefront/legal-page";

export const metadata: Metadata = { alternates: { canonical: "/terms" } };

export default function Page() {
  return <LegalRoute title="الشروط" slug="terms" />;
}
