import type { Metadata } from "next";
import LegalRoute from "@/components/storefront/legal-page";

export const metadata: Metadata = { alternates: { canonical: "/custom-orders-policy" } };

export default function Page() {
  return <LegalRoute title="سياسة الطلبات المخصّصة" slug="custom-orders-policy" />;
}
