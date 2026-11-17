import type { MetadataRoute } from "next";
import { cachePublicQuery } from "@/lib/queries/public-cache";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://taiz3dprinting.dev").replace(/\/+$/, "");
const productBatchSize = 500;

const getPublishedProductSlugs = cachePublicQuery("sitemap-published-products", async (supabase) => {
  const products: { slug: string }[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("slug")
      .eq("is_active", true)
      .order("slug", { ascending: true })
      .range(from, from + productBatchSize - 1);

    if (error) throw error;
    const batch = data ?? [];
    products.push(...batch);
    if (batch.length < productBatchSize) break;
    from += productBatchSize;
  }

  return products;
});

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/products`, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/contact`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/custom-order`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/faq`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/delivery-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/payment-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/refund-policy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/custom-orders-policy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  if (!isSupabaseConfigured()) return staticPages;

  try {
    const products = await getPublishedProductSlugs();
    return [
      ...staticPages,
      ...products.map(({ slug }) => ({
        url: `${siteUrl}/products/${encodeURIComponent(slug)}`,
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ];
  } catch (error) {
    console.error("Sitemap product URLs could not be loaded", { error });
    return staticPages;
  }
}
