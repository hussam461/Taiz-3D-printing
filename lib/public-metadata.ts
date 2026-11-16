import type { Metadata } from "next";
import { getLegalPageTemplate } from "@/lib/content/legal-pages";
import { getLegalPage } from "@/lib/queries/storefront";

export function createPublicPageMetadata(title: string, description: string, canonical: string): Metadata {
  const cleanDescription = description.replace(/\s+/g, " ").trim().slice(0, 160);
  return {
    title,
    description: cleanDescription,
    alternates: { canonical },
    openGraph: {
      title,
      description: cleanDescription,
      url: canonical,
      siteName: "Taiz 3D Printing",
      locale: "ar_YE",
      type: "website",
    },
  };
}

export async function getLegalPageMetadata(slug: string, fallbackTitle: string): Promise<Metadata> {
  const [page, template] = await Promise.all([
    getLegalPage(slug),
    Promise.resolve(getLegalPageTemplate(slug)),
  ]);
  const title = page?.title?.trim() || template?.title || fallbackTitle;
  const description = template?.summary || page?.body || `${title} في متجر Taiz 3D Printing.`;
  return createPublicPageMetadata(title, description, `/${slug}`);
}
