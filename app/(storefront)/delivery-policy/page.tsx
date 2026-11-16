import type { Metadata } from "next";
import LegalRoute from "@/components/storefront/legal-page";

export const metadata: Metadata = { alternates: { canonical: "/delivery-policy" } };

export default function Page() {
  return <LegalRoute title="سياسة التوصيل" slug="delivery-policy" />;
}
