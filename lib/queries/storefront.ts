import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
};

export type HomepageSlide = {
  id: string;
  image_path: string;
  title: string;
  description: string;
  href: string | null;
};

export type HomepageBenefit = {
  id: string;
  title: string;
  description: string;
};

export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_price_old_yer: number;
  discount_percent: number | null;
  is_featured: boolean;
  created_at: string;
  category: { id: string; name: string; slug: string } | null;
  main_image: string | null;
};

async function db() {
  if (!isSupabaseConfigured()) return null;
  return createServerSupabase();
}

export async function getPublishedHomepageSlides(): Promise<HomepageSlide[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("homepage_slides")
    .select("id, image_path, title, description, href")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(8);
  if (error) {
    console.error("Published homepage slides could not be loaded", { error });
    return [];
  }
  return (data ?? []).filter((slide) => Boolean(slide.image_path)) as HomepageSlide[];
}

export async function getPublishedHomepageBenefits(): Promise<HomepageBenefit[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("homepage_benefits")
    .select("id, title, description")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("Published homepage benefits could not be loaded", { error });
    return [];
  }
  return (data ?? []) as HomepageBenefit[];
}

export async function getStorefrontContext() {
  const supabase = await db();
  if (!supabase) {
    return {
      store: {
        store_name: "Taiz 3D Printing",
        description: "منصة يمنية للطباعة ثلاثية الأبعاد.",
        hero_headline: "طباعة ثلاثية الأبعاد بمعايير تصنيع واضحة",
        hero_description:
          "منتجات جاهزة وطلبات مخصّصة، بأسعار بالريال اليمني القديم.",
        logo_path: null as string | null,
        deposit_percent: 30,
      },
      contact: {
        phone: null as string | null,
        whatsapp: null as string | null,
        instagram: null as string | null,
        email: null as string | null,
      },
      configured: false,
    };
  }
  const [{ data: store }, { data: contact }] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("contact_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    store: store ?? {
      store_name: "Taiz 3D Printing",
      description: "",
      hero_headline: "طباعة ثلاثية الأبعاد بتفاصيل تصنع الفرق",
      hero_description: "",
      logo_path: null,
      deposit_percent: 30,
    },
    contact: contact ?? { phone: null, whatsapp: null, instagram: null, email: null },
    configured: true,
  };
}

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("categories")
    .select("id, name, slug, description")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

function mapProducts(
  rows: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    base_price_old_yer: number;
    discount_percent: number | null;
    is_featured: boolean;
    created_at: string;
    categories: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[] | null;
    product_images: { storage_path: string; is_main: boolean }[] | null;
  }>,
): ProductCard[] {
  return rows.map((row) => {
    const category = Array.isArray(row.categories) ? row.categories[0] : row.categories;
    const images = row.product_images ?? [];
    const main = images.find((img) => img.is_main) ?? images[0];
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      base_price_old_yer: Number(row.base_price_old_yer),
      discount_percent: row.discount_percent == null ? null : Number(row.discount_percent),
      is_featured: row.is_featured,
      created_at: row.created_at,
      category: category ?? null,
      main_image: main?.storage_path ?? null,
    };
  });
}

export async function getFeaturedProducts(): Promise<ProductCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories(id, name, slug), product_images(storage_path, is_main)",
    )
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(8);
  return mapProducts(data ?? []);
}

export async function getLatestProducts(): Promise<ProductCard[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories(id, name, slug), product_images(storage_path, is_main)",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8);
  return mapProducts(data ?? []);
}

export async function getRelatedProducts(categorySlug: string, excludeProductId: string): Promise<ProductCard[]> {
  const supabase = await db();
  if (!supabase || !categorySlug) return [];
  const { data } = await supabase
    .from("products")
    .select("id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories!inner(id, name, slug), product_images(storage_path, is_main)")
    .eq("is_active", true)
    .eq("categories.slug", categorySlug)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(8);
  return mapProducts(data ?? []);
}

export type ProductListQuery = {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  discounted?: boolean;
  featured?: boolean;
  sort?: "newest" | "price_asc" | "price_desc" | "relevance";
  page?: number;
};

export async function searchProducts(query: ProductListQuery) {
  const supabase = await db();
  if (!supabase) return { items: [] as ProductCard[], total: 0, page: 1, pageSize: 12 };
  const page = Math.max(1, query.page ?? 1);
  const pageSize = 12;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const term = query.q?.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  const sort = query.sort ?? (term ? "relevance" : "newest");
  const buildRequest = () => {
    let request = supabase
      .from("products")
      .select(
        `id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories${query.category ? "!inner" : ""}(id, name, slug), product_images(storage_path, is_main)`,
        { count: "exact" },
      )
      .eq("is_active", true);
    if (query.category) request = request.eq("categories.slug", query.category);
    if (query.featured) request = request.eq("is_featured", true);
    if (query.discounted) request = request.not("discount_percent", "is", null);
    if (query.minPrice != null) request = request.gte("base_price_old_yer", query.minPrice);
    if (query.maxPrice != null) request = request.lte("base_price_old_yer", query.maxPrice);
    if (sort === "price_asc") request = request.order("base_price_old_yer", { ascending: true });
    else if (sort === "price_desc") request = request.order("base_price_old_yer", { ascending: false });
    else request = request.order("created_at", { ascending: false });
    return request;
  };

  if (term) {
    const { data: matchedCategories, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("is_active", true)
      .ilike("name", `%${term}%`);
    if (categoryError) console.error("Product search category lookup failed", { error: categoryError });
    const categoryIds = (matchedCategories ?? []).map((category) => category.id);
    const productFilter = `name.ilike.%${term}%,description.ilike.%${term}%`;
    const nameRequest = buildRequest().or(productFilter).range(0, to);
    if (!categoryIds.length) {
      const { data, count, error } = await nameRequest;
      if (error) console.error("Product search failed", { error });
      return { items: mapProducts(data ?? []), total: count ?? 0, page, pageSize };
    }

    const categoryRequest = buildRequest().in("category_id", categoryIds).range(0, to);
    let overlapRequest = supabase
      .from("products")
      .select("id, categories!inner(slug)", { count: "exact", head: true })
      .eq("is_active", true)
      .in("category_id", categoryIds)
      .or(productFilter);
    if (query.category) overlapRequest = overlapRequest.eq("categories.slug", query.category);
    if (query.featured) overlapRequest = overlapRequest.eq("is_featured", true);
    if (query.discounted) overlapRequest = overlapRequest.not("discount_percent", "is", null);
    if (query.minPrice != null) overlapRequest = overlapRequest.gte("base_price_old_yer", query.minPrice);
    if (query.maxPrice != null) overlapRequest = overlapRequest.lte("base_price_old_yer", query.maxPrice);
    const [nameResult, categoryResult, overlapResult] = await Promise.all([
      nameRequest,
      categoryRequest,
      overlapRequest,
    ]);
    if (nameResult.error) console.error("Product name search failed", { error: nameResult.error });
    if (categoryResult.error) console.error("Product category search failed", { error: categoryResult.error });
    if (overlapResult.error) console.error("Product search count failed", { error: overlapResult.error });

    const rowsById = new Map<string, NonNullable<typeof nameResult.data>[number]>();
    for (const row of [...(nameResult.data ?? []), ...(categoryResult.data ?? [])]) rowsById.set(row.id, row);
    const rows = [...rowsById.values()];
    if (sort === "price_asc") rows.sort((a, b) => Number(a.base_price_old_yer) - Number(b.base_price_old_yer));
    else if (sort === "price_desc") rows.sort((a, b) => Number(b.base_price_old_yer) - Number(a.base_price_old_yer));
    else rows.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
    const total = Math.max(0, (nameResult.count ?? 0) + (categoryResult.count ?? 0) - (overlapResult.count ?? 0));
    return { items: mapProducts(rows.slice(from, to + 1)), total, page, pageSize };
  }

  const { data, count, error } = await buildRequest().range(from, to);
  if (error) console.error("Product list query failed", { error });
  return { items: mapProducts(data ?? []), total: count ?? 0, page, pageSize };
}

export const getProductBySlug = cache(async (slug: string) => {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase
    .from("products")
    .select(
      "*, categories(id, name, slug), product_images(id, storage_path, alt_text, sort_order, is_main)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data;
});

export async function getColors() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("colors").select("*").eq("is_active", true).order("sort_order");
  return data ?? [];
}

export async function getMaterials() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase.from("materials").select("*").eq("is_active", true).order("sort_order");
  return data ?? [];
}

export async function getDeliveryAreas() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("delivery_areas")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return data ?? [];
}

export async function getPaymentAccounts(currency?: "OLD_YER" | "NEW_YER") {
  const supabase = await db();
  if (!supabase) return [];
  let request = supabase.from("payment_accounts").select("*").eq("is_active", true).order("sort_order");
  if (currency) request = request.eq("currency_code", currency);
  const { data } = await request;
  return data ?? [];
}

export async function getCheckoutConfig() {
  const supabase = await db();
  if (!supabase) return null;
  const [{ data: freeDelivery }, { data: rate }, { data: store }] = await Promise.all([
    supabase.from("free_delivery_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("exchange_rates").select("*").order("created_at", { ascending: false }).limit(1),
    supabase.from("store_settings").select("deposit_percent").eq("id", 1).maybeSingle(),
  ]);
  return {
    freeDelivery: freeDelivery ?? { is_enabled: false, min_order_value_old_yer: 0 },
    exchange: rate?.[0] ?? { new_rial_per_old_rial: 1 },
    depositPercent: Number(store?.deposit_percent ?? 30),
  };
}

export async function getFaq() {
  const supabase = await db();
  if (!supabase) return [];
  const { data } = await supabase
    .from("faq_items")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  return data ?? [];
}

export async function getLegalPage(slug: string) {
  const supabase = await db();
  if (!supabase) return null;
  const { data } = await supabase.from("legal_pages").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function getSearchSuggestions(q: string) {
  const supabase = await db();
  if (!supabase || q.trim().length < 2) return { products: [] as string[], categories: [] as string[] };
  const term = q.trim();
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase.from("products").select("name").eq("is_active", true).ilike("name", `%${term}%`).limit(5),
    supabase.from("categories").select("name").eq("is_active", true).ilike("name", `%${term}%`).limit(5),
  ]);
  return {
    products: (products ?? []).map((p) => p.name),
    categories: (categories ?? []).map((c) => c.name),
  };
}
