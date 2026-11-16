import type { Metadata } from "next";
import LegalRoute from "@/components/storefront/legal-page";

export const metadata: Metadata = { alternates: { canonical: "/refund-policy" } };

export default function Page() {
  return <LegalRoute title="سياسة الاسترجاع" slug="refund-policy" />;
}
