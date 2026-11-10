import { cache } from "react";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { publicMediaUrl } from "@/lib/storage/public-url";

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

export async function getCustomOrderContent(): Promise<CustomOrderContent> {
  const supabase = await db();
  if (!supabase) return DEFAULT_CUSTOM_ORDER_CONTENT;
  const { data, error } = await supabase.from("custom_order_content").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) console.error("Custom order content could not be loaded", { error });
    return DEFAULT_CUSTOM_ORDER_CONTENT;
  }
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
         all_products_image_path: null as string | null,
         custom_order_image_path: null as string | null,
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
      all_products_image_path: null,
      custom_order_image_path: null,
      deposit_percent: 30,
    },
    contact: contact ?? { phone: null, whatsapp: null, instagram: null, email: null },
    configured: true,
  };
}

export async function getActiveCategories(): Promise<Category[]> {
  const supabase = await db();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_path")
    .eq("is_active", true)
    .order("sort_order");
  if (error?.code === "PGRST204" || error?.code === "42703") {
    const legacy = await supabase.from("categories").select("id, name, slug, description").eq("is_active", true).order("sort_order");
    return legacy.data ?? [];
  }
  if (error) {
    console.error("Active categories could not be loaded", { error });
    return [];
  }
  return (data ?? []).map((category) => ({
    ...category,
    image_url: publicMediaUrl(category.image_path, "store-assets"),
  }));
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

export async function searchProducts(query: ProductListQuery) {
  const supabase = await db();
  if (!supabase) return { items: [] as ProductCard[], total: 0, page: 1, pageSize: PRODUCTS_PAGE_SIZE };
  const page = Math.max(1, query.page ?? 1);
  const pageSize = PRODUCTS_PAGE_SIZE;
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
