import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("custom-orders-policy", "سياسة الطلبات المخصصة");
}

export default function Page() {
  return <LegalRoute title="سياسة الطلبات المخصّصة" slug="custom-orders-policy" />;
}
