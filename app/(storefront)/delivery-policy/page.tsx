import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("delivery-policy", "سياسة التوصيل");
}

export default function Page() {
  return <LegalRoute title="سياسة التوصيل" slug="delivery-policy" />;
}
