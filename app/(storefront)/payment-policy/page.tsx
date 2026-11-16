import type { Metadata } from "next";
import LegalRoute from "@/components/storefront/legal-page";

export const metadata: Metadata = { alternates: { canonical: "/payment-policy" } };

export default function Page() {
  return <LegalRoute title="سياسة الدفع" slug="payment-policy" />;
}
