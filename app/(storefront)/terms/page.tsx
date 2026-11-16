import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("terms", "الشروط والأحكام");
}

export default function Page() {
  return <LegalRoute title="الشروط" slug="terms" />;
}
