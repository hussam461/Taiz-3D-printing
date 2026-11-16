import type { Metadata } from "next";
import LegalRoute from "@/components/storefront/legal-page";

export const metadata: Metadata = { alternates: { canonical: "/about" } };

export default function Page() {
  return <LegalRoute title="من نحن" slug="about" />;
}
