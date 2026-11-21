import type { Metadata } from "next";
import { getLegalPageTemplate } from "@/lib/content/legal-pages";
import { getLegalPage } from "@/lib/queries/storefront";

export function createPublicPageMetadata(
  title: string,
  description: string,
  canonical: string,
  options: { absoluteTitle?: boolean; fullDescription?: boolean } = {},
): Metadata {
  const normalizedDescription = description.replace(/\s+/g, " ").trim();
  const cleanDescription = options.fullDescription ? normalizedDescription : normalizedDescription.slice(0, 160);
  return {
    title: options.absoluteTitle ? { absolute: title } : title,
    description: cleanDescription,
    alternates: { canonical },
    openGraph: {
      title,
      description: cleanDescription,
      url: canonical,
      siteName: "Taiz 3D Printing",
      locale: "ar_YE",
      type: "website",
      images: [{
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Taiz 3D Printing — طباعة ثلاثية الأبعاد في اليمن",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cleanDescription,
      images: ["/opengraph-image"],
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
