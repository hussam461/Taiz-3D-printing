import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { publicMediaUrl } from "@/lib/storage/public-url";
import { cachePublicQuery } from "@/lib/queries/public-cache";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url?: string | null;
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

export type CustomOrderContent = {
  eyebrow: string;
  title: string;
  description: string;
  whatsapp_message: string;
  response_time: string;
  process_title: string;
  process_description: string;
  steps: Array<{ title: string; description: string }>;
  materials_title: string;
  materials_description: string;
  materials: string[];
  note: string;
};

const DEFAULT_CUSTOM_ORDER_CONTENT: CustomOrderContent = {
  eyebrow: "تصنيع حسب فكرتك",
  title: "حوّل فكرتك إلى قطعة مطبوعة ثلاثيًا",
  description: "لديك فكرة أو تصميم أو صورة وتحتاج إلى تنفيذها؟ تواصل معنا عبر واتساب، وسنراجع التفاصيل معك ونقترح طريقة التنفيذ المناسبة.",
  whatsapp_message: "مرحبًا، أريد طلب طباعة ثلاثية الأبعاد مخصّصة.",
  response_time: "نراجع التفاصيل ونرد عليك بأقرب وقت ممكن.",
  process_title: "كيف يتم طلبك؟",
  process_description: "ثلاث خطوات واضحة من إرسال الفكرة حتى تأكيد التنفيذ.",
  steps: [
    { title: "شارك فكرتك", description: "أرسل وصفًا مختصرًا لما تريد طباعته أو أرفق صورة أو تصميمًا في المحادثة." },
    { title: "نراجع التفاصيل", description: "نراجع الفكرة وإمكانية التنفيذ والخامة المناسبة، ثم نوضح لك أي تفاصيل لازمة." },
    { title: "نؤكد السعر والمدة", description: "يتم الاتفاق على السعر ومدة الإنتاج وطريقة التسليم قبل بدء التنفيذ." },
  ],
  materials_title: "ما الذي يمكنك إرساله؟",
  materials_description: "أرسل وصفًا للفكرة، صورة مرجعية، رسمًا، أو ملف تصميم جاهز. الطلبات المخصصة لا تُسعّر تلقائيًا من السلة؛ يتم تحديد السعر والتفاصيل بعد مراجعة الطلب.",
  materials: ["فكرة أو وصف للقطعة", "صورة أو رسم مرجعي", "ملف تصميم جاهز", "الخامة واللون المطلوبان"],
  note: "هذا المسار مخصص للطلبات التي تحتاج مراجعة وتسعيرًا يدويًا. لا يتم تأكيد الطلب أو بدء التصنيع قبل الاتفاق معك على السعر والتفاصيل.",
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

const getCachedPublishedHomepageSlides = cachePublicQuery("homepage-slides", async (supabase) => {
  const { data, error } = await supabase
    .from("homepage_slides")
    .select("id, image_path, title, description, href")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .limit(8);
  if (error) throw error;
  return (data ?? []).filter((slide) => Boolean(slide.image_path)) as HomepageSlide[];
});

export async function getPublishedHomepageSlides(): Promise<HomepageSlide[]> {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedPublishedHomepageSlides(); }
  catch (error) { console.error("Published homepage slides could not be loaded", { error }); return []; }
}

const getCachedPublishedHomepageBenefits = cachePublicQuery("homepage-benefits", async (supabase) => {
  const { data, error } = await supabase
    .from("homepage_benefits")
    .select("id, title, description")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as HomepageBenefit[];
});

export async function getPublishedHomepageBenefits(): Promise<HomepageBenefit[]> {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedPublishedHomepageBenefits(); }
  catch (error) { console.error("Published homepage benefits could not be loaded", { error }); return []; }
}

const getCachedCustomOrderContent = cachePublicQuery("custom-order-content", async (supabase) => {
  const { data, error } = await supabase.from("custom_order_content").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data;
});

export async function getCustomOrderContent(): Promise<CustomOrderContent> {
  if (!isSupabaseConfigured()) return DEFAULT_CUSTOM_ORDER_CONTENT;
  let data;
  try { data = await getCachedCustomOrderContent(); }
  catch (error) { console.error("Custom order content could not be loaded", { error }); return DEFAULT_CUSTOM_ORDER_CONTENT; }
  if (!data) return DEFAULT_CUSTOM_ORDER_CONTENT;
  const rawSteps: unknown = data.steps;
  const rawMaterials: unknown = data.materials;
  const steps = Array.isArray(rawSteps) ? rawSteps.filter((step: unknown): step is { title: string; description: string } => Boolean(step && typeof step === "object" && "title" in step && typeof step.title === "string" && "description" in step && typeof step.description === "string")) : [];
  const materials = Array.isArray(rawMaterials) ? rawMaterials.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0) : [];
  return {
    ...DEFAULT_CUSTOM_ORDER_CONTENT,
    ...data,
    steps: steps.length ? steps : DEFAULT_CUSTOM_ORDER_CONTENT.steps,
    materials: materials.length ? materials : DEFAULT_CUSTOM_ORDER_CONTENT.materials,
  } as CustomOrderContent;
}

const getCachedStorefrontContext = cachePublicQuery("storefront-context", async (supabase) => {
  const [{ data: store }, { data: contact }] = await Promise.all([
    supabase.from("store_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("contact_settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    store: {
      store_name: "Taiz 3D Printing",
      description: "",
      hero_headline: "طباعة ثلاثية الأبعاد بتفاصيل تصنع الفرق",
      hero_description: "",
      logo_path: null,
      all_products_image_path: null,
      custom_order_image_path: null,
      announcement_enabled: true,
      announcement_text: "عروض جديدة ومنتجات مميزة بانتظارك",
      announcement_button_label: "تسوق الآن",
      announcement_href: "/products",
      announcement_scope: "all",
      announcement_button_enabled: true,
      deposit_percent: 30,
      ...(store ?? {}),
    },
    contact: contact ?? { phone: null, whatsapp: null, instagram: null, email: null },
    configured: true,
  };
});

export async function getStorefrontContext() {
  if (!isSupabaseConfigured()) {
    return {
      store: {
        store_name: "Taiz 3D Printing",
        description: "منصة يمنية للطباعة ثلاثية الأبعاد.",
        hero_headline: "طباعة ثلاثية الأبعاد بمعايير تصنيع واضحة",
        hero_description: "منتجات جاهزة وطلبات مخصّصة، بأسعار بالريال اليمني القديم.",
        logo_path: null as string | null,
        all_products_image_path: null as string | null,
        custom_order_image_path: null as string | null,
        announcement_enabled: true,
        announcement_text: "عروض جديدة ومنتجات مميزة بانتظارك",
        announcement_button_label: "تسوق الآن",
        announcement_href: "/products",
        announcement_scope: "all",
        announcement_button_enabled: true,
        deposit_percent: 30,
      },
      contact: { phone: null as string | null, whatsapp: null as string | null, instagram: null as string | null, email: null as string | null },
      configured: false,
    };
  }
  return getCachedStorefrontContext();
}

const getCachedActiveCategories = cachePublicQuery("active-categories", async (supabase) => {
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_path")
    .eq("is_active", true)
    .order("sort_order");
  if (error?.code === "PGRST204" || error?.code === "42703") {
    const legacy = await supabase.from("categories").select("id, name, slug, description").eq("is_active", true).order("sort_order");
    if (legacy.error) throw legacy.error;
    return legacy.data ?? [];
  }
  if (error) throw error;
  return (data ?? []).map((category) => ({
    ...category,
    image_url: publicMediaUrl(category.image_path, "store-assets"),
  }));
});

export async function getActiveCategories(): Promise<Category[]> {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedActiveCategories(); }
  catch (error) { console.error("Active categories could not be loaded", { error }); return []; }
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

const getCachedFeaturedProducts = cachePublicQuery("featured-products", async (supabase) => {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories!products_category_id_fkey(id, name, slug), product_images(storage_path, is_main)",
    )
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return mapProducts(data ?? []);
});

export async function getFeaturedProducts(): Promise<ProductCard[]> {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedFeaturedProducts(); }
  catch (error) { console.error("Featured products could not be loaded", { error }); return []; }
}

const getCachedLatestProducts = cachePublicQuery("latest-products", async (supabase) => {
  const { data, error } = await supabase
    .from("products")
    .select(
      "id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories!products_category_id_fkey(id, name, slug), product_images(storage_path, is_main)",
    )
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return mapProducts(data ?? []);
});

export async function getLatestProducts(): Promise<ProductCard[]> {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedLatestProducts(); }
  catch (error) { console.error("Latest products could not be loaded", { error }); return []; }
}

const getCachedRelatedProducts = cachePublicQuery("related-products", async (supabase, categorySlug: string, excludeProductId: string) => {
  if (!categorySlug) return [] as ProductCard[];
  const { data, error } = await supabase
    .from("products")
    .select("id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories!products_category_id_fkey!inner(id, name, slug), product_images(storage_path, is_main)")
    .eq("is_active", true)
    .eq("categories.slug", categorySlug)
    .neq("id", excludeProductId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return mapProducts(data ?? []);
});

export async function getRelatedProducts(categorySlug: string, excludeProductId: string): Promise<ProductCard[]> {
  if (!isSupabaseConfigured() || !categorySlug) return [];
  try { return await getCachedRelatedProducts(categorySlug, excludeProductId); }
  catch (error) { console.error("Related products could not be loaded", { categorySlug, error }); return []; }
}

export const PRODUCTS_PAGE_SIZE = 15;

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

const getCachedSearchProducts = cachePublicQuery("product-search", async (supabase, query: ProductListQuery) => {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = PRODUCTS_PAGE_SIZE;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const term = query.q?.replace(/[^\p{L}\p{N}\s-]/gu, " ").trim();
  const sort = query.sort ?? (term ? "relevance" : "newest");
  let selectedCategoryId: string | null = null;
  if (query.category) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", query.category)
      .eq("is_active", true)
      .maybeSingle();
    if (categoryError) {
      console.error("Active category lookup failed", { slug: query.category, error: categoryError });
      throw categoryError;
    }
    if (!category) return { items: [] as ProductCard[], total: 0, page, pageSize };
    selectedCategoryId = category.id;
  }
  const buildRequest = (includeMembership = Boolean(selectedCategoryId)) => {
    const request = includeMembership
      ? supabase.from("products").select(
          "id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories!products_category_id_fkey(id, name, slug), product_images(storage_path, is_main), product_categories!inner(category_id)",
          { count: "exact" },
        )
      : supabase.from("products").select(
          "id, name, slug, description, base_price_old_yer, discount_percent, is_featured, created_at, categories!products_category_id_fkey(id, name, slug), product_images(storage_path, is_main)",
          { count: "exact" },
        );
    let filteredRequest = request.eq("is_active", true);
    if (selectedCategoryId) filteredRequest = filteredRequest.eq("product_categories.category_id", selectedCategoryId);
    if (query.featured) filteredRequest = filteredRequest.eq("is_featured", true);
    if (query.discounted) filteredRequest = filteredRequest.not("discount_percent", "is", null);
    if (query.minPrice != null) filteredRequest = filteredRequest.gte("base_price_old_yer", query.minPrice);
    if (query.maxPrice != null) filteredRequest = filteredRequest.lte("base_price_old_yer", query.maxPrice);
    if (sort === "price_asc") filteredRequest = filteredRequest.order("base_price_old_yer", { ascending: true });
    else if (sort === "price_desc") filteredRequest = filteredRequest.order("base_price_old_yer", { ascending: false });
    else filteredRequest = filteredRequest.order("created_at", { ascending: false });
    return filteredRequest;
  };

  if (term) {
    const { data: matchedCategoryProducts, error: categoryError } = await supabase.rpc("storefront_product_ids_by_category_name", { p_term: term });
    if (categoryError) {
      console.error("Product search category lookup failed", { error: categoryError });
      throw categoryError;
    }
    const categoryProductIds = [...new Set(((matchedCategoryProducts ?? []) as { product_id: string }[]).map((row) => row.product_id))];
    const productFilter = `name.ilike.%${term}%,description.ilike.%${term}%`;
    const nameRequest = buildRequest().or(productFilter).range(0, to);
    if (!categoryProductIds.length) {
      const { data, count, error } = await nameRequest;
      if (error) throw error;
      return { items: mapProducts(data ?? []), total: count ?? 0, page, pageSize };
    }

    const categoryRequest = buildRequest().in("id", categoryProductIds).range(0, to);
    const overlapRequest = buildRequest().in("id", categoryProductIds).or(productFilter).range(0, 0);
    const [nameResult, categoryResult, overlapResult] = await Promise.all([nameRequest, categoryRequest, overlapRequest]);
    if (nameResult.error) throw nameResult.error;
    if (categoryResult.error) throw categoryResult.error;
    if (overlapResult.error) throw overlapResult.error;

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
  if (error) throw error;
  return { items: mapProducts(data ?? []), total: count ?? 0, page, pageSize };
});

export async function searchProducts(query: ProductListQuery) {
  const page = Math.max(1, query.page ?? 1);
  if (!isSupabaseConfigured()) return { items: [] as ProductCard[], total: 0, page: 1, pageSize: PRODUCTS_PAGE_SIZE };
  try {
    return await getCachedSearchProducts(query);
  } catch (error) {
    console.error("Product list query failed", { error });
    return { items: [] as ProductCard[], total: 0, page, pageSize: PRODUCTS_PAGE_SIZE };
  }
}

const getCachedProductBySlug = cachePublicQuery("product-by-slug", async (supabase, slug: string) => {
  const { data, error } = await supabase
    .from("products")
    .select(
      "*, categories!products_category_id_fkey(id, name, slug), product_images(id, storage_path, alt_text, sort_order, is_main)",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const getProductBySlug = cache(async (slug: string) => {
  if (!isSupabaseConfigured()) return null;
  try { return await getCachedProductBySlug(slug); }
  catch (error) { console.error("Product details could not be loaded", { slug, error }); return null; }
});

const getCachedColors = cachePublicQuery("colors", async (supabase) => {
  const { data, error } = await supabase.from("colors").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export async function getColors() {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedColors(); }
  catch (error) { console.error("Active colors could not be loaded", { error }); return []; }
}

const getCachedMaterials = cachePublicQuery("materials", async (supabase) => {
  const { data, error } = await supabase.from("materials").select("*").eq("is_active", true).order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export async function getMaterials() {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedMaterials(); }
  catch (error) { console.error("Active materials could not be loaded", { error }); return []; }
}

const getCachedDeliveryAreas = cachePublicQuery("delivery-areas", async (supabase) => {
  const { data, error } = await supabase
    .from("delivery_areas")
    .select("id, governorate, city_area, fee_old_yer, is_default")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export async function getDeliveryAreas() {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedDeliveryAreas(); }
  catch (error) { console.error("Active delivery areas could not be loaded", { error }); return []; }
}

const getCachedPaymentAccounts = cachePublicQuery("payment-accounts", async (supabase, currency?: "OLD_YER" | "NEW_YER") => {
  let request = supabase
    .from("payment_accounts")
    .select("id, name, account_number, currency_code, instructions")
    .eq("is_active", true)
    .order("sort_order");
  if (currency) request = request.eq("currency_code", currency);
  const { data, error } = await request;
  if (error) throw error;
  return data ?? [];
});

export async function getPaymentAccounts(currency?: "OLD_YER" | "NEW_YER") {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedPaymentAccounts(currency); }
  catch (error) { console.error("Active payment accounts could not be loaded", { error }); return []; }
}

const getCachedCheckoutConfig = cachePublicQuery("checkout-config", async (supabase) => {
  const [freeResult, rateResult, storeResult] = await Promise.all([
    supabase.from("free_delivery_settings").select("is_enabled, min_order_value_old_yer").eq("id", 1).maybeSingle(),
    supabase.from("exchange_rates").select("new_rial_per_old_rial, created_at").order("created_at", { ascending: false }).limit(1),
    supabase.from("store_settings").select("deposit_percent").eq("id", 1).maybeSingle(),
  ]);
  const error = freeResult.error ?? rateResult.error ?? storeResult.error;
  if (error) throw error;
  return {
    freeDelivery: freeResult.data ?? { is_enabled: false, min_order_value_old_yer: 0 },
    exchange: rateResult.data?.[0] ?? { new_rial_per_old_rial: 1 },
    depositPercent: Number(storeResult.data?.deposit_percent ?? 30),
  };
});

export async function getCheckoutConfig() {
  if (!isSupabaseConfigured()) return null;
  try { return await getCachedCheckoutConfig(); }
  catch (error) { console.error("Checkout configuration could not be loaded", { error }); return null; }
}

const getCachedFaq = cachePublicQuery("faq", async (supabase) => {
  const { data, error } = await supabase
    .from("faq_items")
    .select("*")
    .eq("is_published", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
});

export async function getFaq() {
  if (!isSupabaseConfigured()) return [];
  try { return await getCachedFaq(); }
  catch (error) { console.error("Published FAQ could not be loaded", { error }); return []; }
}

const getCachedLegalPage = cachePublicQuery("legal-page", async (supabase, slug: string) => {
  const { data, error } = await supabase.from("legal_pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
});

export async function getLegalPage(slug: string) {
  if (!isSupabaseConfigured()) return null;
  try { return await getCachedLegalPage(slug); }
  catch (error) { console.error("Legal page could not be loaded", { slug, error }); return null; }
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
