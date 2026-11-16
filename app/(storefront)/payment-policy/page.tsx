import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("payment-policy", "سياسة الدفع");
}

export default function Page() {
  return <LegalRoute title="سياسة الدفع" slug="payment-policy" />;
}
