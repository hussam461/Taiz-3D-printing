import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { ProductFilters } from "@/components/admin/product-filters";
import { AdminProductList } from "@/components/admin/product-list";
import { FeedbackNotice } from "@/components/admin/feedback-notice";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; featured?: string; category?: string; sort?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  const relation = params.category ? "product_categories!inner" : "product_categories";
  let productsRequest = supabase.from("products").select(
    `id, name, slug, base_price_old_yer, discount_percent, is_active, is_featured, ${relation}(category_id, categories(name)), product_images(storage_path, is_main)`,
    { count: "exact" },
  );
  const searchTerm = params.q?.replace(/[%_]/g, " ").trim();
  if (searchTerm) productsRequest = productsRequest.ilike("name", `%${searchTerm}%`);
  if (params.status === "active") productsRequest = productsRequest.eq("is_active", true);
  if (params.status === "inactive") productsRequest = productsRequest.eq("is_active", false);
  if (params.featured === "1") productsRequest = productsRequest.eq("is_featured", true);
  if (params.category) productsRequest = productsRequest.eq("product_categories.category_id", params.category);
  const orderColumn = params.sort === "name" ? "name" : params.sort === "price" || params.sort === "price_desc" ? "base_price_old_yer" : "created_at";
  const [{ data: categories }, { data, error: productsError, count }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    productsRequest.order(orderColumn, { ascending: params.sort === "name" || params.sort === "price" }).order("id", { ascending: true }).range(0, 9),
  ]);
  const products = data ?? [];

  return <div className="mx-auto max-w-7xl space-y-6">
    <header className="flex items-center justify-between gap-3 border-b border-border pb-4 sm:items-end sm:pb-6">
      <div><p className="text-sm font-medium text-primary">الكتالوج</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">المنتجات</h1><p className="mt-2 hidden text-sm text-muted sm:block">أنشئ منتجاتك، أدر أسعارها وصورها، وتحكم في ظهورها للعملاء.</p></div>
      <Link href="/admin/products/new" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-primary-hover sm:px-4 sm:text-sm"><span aria-hidden="true" className="text-base leading-none">+</span>إضافة منتج</Link>
    </header>

    <ProductFilters categories={categories ?? []} values={params} />
    {params.saved === "created" || params.saved === "updated" ? <FeedbackNotice tone="success" message={params.saved === "created" ? "تم إنشاء المنتج بنجاح." : "تم تحديث المنتج بنجاح."} autoDismissMs={4000} clearQueryParam="saved" /> : null}
    {productsError ? <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">تعذر تحميل قائمة المنتجات. حدّث الصفحة، وإذا استمرت المشكلة فتحقق من اتصال قاعدة البيانات.</section> : <>
      <div className="text-sm text-muted">{count ?? 0} منتج</div>
      {products.length === 0 ? <section className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center shadow-sm"><h2 className="font-semibold">لا توجد منتجات مطابقة</h2><p className="mt-2 text-sm text-muted">جرّب تغيير خيارات البحث أو أضف منتجًا جديدًا إلى الكتالوج.</p><Link href="/admin/products/new" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">إضافة أول منتج</Link></section> : <AdminProductList key={products.map((product) => `${product.id}:${product.is_active}`).join("|")} initialProducts={products} count={count ?? 0} filters={params} />}
    </>}
  </div>;
}
