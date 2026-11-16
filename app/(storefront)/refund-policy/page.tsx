import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("refund-policy", "سياسة الإلغاء والاسترجاع");
}

export default function Page() {
  return <LegalRoute title="سياسة الاسترجاع" slug="refund-policy" />;
}
