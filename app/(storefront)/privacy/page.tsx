import LegalRoute from "@/components/storefront/legal-page";
import { getLegalPageMetadata } from "@/lib/public-metadata";

export function generateMetadata() {
  return getLegalPageMetadata("privacy", "سياسة الخصوصية");
}

export default function Page() {
  return <LegalRoute title="الخصوصية" slug="privacy" />;
}
