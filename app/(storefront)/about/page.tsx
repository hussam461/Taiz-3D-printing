import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("about", "من نحن");
}

export default function Page() {
  return <LegalRoute title="من نحن" slug="about" />;
}
