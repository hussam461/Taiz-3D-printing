import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { deleteProduct, toggleProductPublication } from "@/lib/admin/actions";
import { ProductFilters } from "@/components/admin/product-filters";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { publicMediaUrl } from "@/lib/storage/public-url";
import Image from "next/image";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; featured?: string; category?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabase();
  let productsRequest = supabase
    .from("products")
    .select("id, name, slug, base_price_old_yer, discount_percent, is_active, is_featured, created_at, updated_at, categories(name), product_images(storage_path, is_main)", { count: "exact" });
  const searchTerm = params.q?.replace(/[%_]/g, " ").trim();
  if (searchTerm) productsRequest = productsRequest.ilike("name", `%${searchTerm}%`);
  if (params.status === "active") productsRequest = productsRequest.eq("is_active", true);
  if (params.status === "inactive") productsRequest = productsRequest.eq("is_active", false);
  if (params.featured === "1") productsRequest = productsRequest.eq("is_featured", true);
  if (params.category) productsRequest = productsRequest.eq("category_id", params.category);
  const orderColumn = params.sort === "name" ? "name" : params.sort === "price" || params.sort === "price_desc" ? "base_price_old_yer" : "created_at";
  const pageSize = 20;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const [{ data: categories }, { data, error: productsError, count }] = await Promise.all([
    supabase.from("categories").select("id, name").order("sort_order"),
    productsRequest.order(orderColumn, { ascending: params.sort === "name" || params.sort === "price" }).range((page - 1) * pageSize, page * pageSize - 1),
  ]);
  const products = data ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">الكتالوج</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">المنتجات</h1>
          <p className="mt-2 text-sm text-muted">أنشئ منتجاتك، أدر أسعارها وصورها، وتحكم في ظهورها للعملاء.</p>
        </div>
        <Link href="/admin/products/new" className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover">+ إضافة منتج</Link>
      </header>

      <ProductFilters categories={categories ?? []} values={params} />

      {productsError ? <section role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">تعذر تحميل قائمة المنتجات. حدّث الصفحة، وإذا استمرت المشكلة فتحقق من اتصال قاعدة البيانات.</section> : null}
      <div className="flex items-center justify-between text-sm text-muted"><span>{count ?? 0} منتج</span><span>الأسعار المعروضة بالريال اليمني القديم</span></div>
      {productsError ? null : products.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center shadow-sm"><h2 className="font-semibold">لا توجد منتجات مطابقة</h2><p className="mt-2 text-sm text-muted">جرّب تغيير خيارات البحث أو أضف منتجًا جديدًا إلى الكتالوج.</p><Link href="/admin/products/new" className="mt-5 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">إضافة أول منتج</Link></section>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm">
          <table className="w-full min-w-[1020px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-4 font-medium">المنتج</th><th className="p-4 font-medium">التصنيف</th><th className="p-4 font-medium">السعر الأساسي</th><th className="p-4 font-medium">الحالة</th><th className="p-4 font-medium">إجراءات</th></tr></thead>
            <tbody>
              {products.map((product) => {
                const category = Array.isArray(product.categories) ? (product.categories[0] as { name?: string } | undefined)?.name : (product.categories as { name?: string } | null)?.name;
                return <tr key={product.id} className="border-t border-border transition hover:bg-slate-50/70">
                  <td className="p-4"><div className="flex items-center gap-3"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">{(() => { const images = (product.product_images ?? []) as { storage_path: string; is_main: boolean }[]; const image = images.find((item) => item.is_main) ?? images[0]; const src = publicMediaUrl(image?.storage_path ?? null); return src ? <Image src={src} alt="" fill sizes="48px" unoptimized className="object-cover" /> : <span title="لا توجد صورة للمنتج" aria-label="لا توجد صورة للمنتج" className="flex h-full items-center justify-center text-slate-400"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><rect x="3.5" y="4.5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/><circle cx="9" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="m5 17 5-4 3 2 2-2 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span>; })()}</div><div><Link className="font-medium text-primary hover:underline" href={`/admin/products/${product.id}`}>{product.name}</Link><span className="mt-1 block text-xs text-muted">/{product.slug}</span></div></div></td>
                  <td className="p-4 text-muted">{category ?? "بدون تصنيف"}</td>
                  <td className="whitespace-nowrap p-4"><span dir="auto" className="font-medium tabular-nums">{product.base_price_old_yer.toLocaleString("ar-YE-u-nu-latn")}</span><span className="ms-1 text-xs text-muted">ريال قديم</span>{product.discount_percent ? <span className="ms-2 text-xs text-success">-{product.discount_percent}%</span> : null}</td>
                  <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active ? "bg-green-50 text-success" : "bg-slate-100 text-muted"}`}>{product.is_active ? "منشور وفعال" : "مسودة / غير فعال"}</span>{product.is_featured ? <span className="ms-2 text-xs text-warning">مميز</span> : null}</td>
                  <td className="w-[250px] whitespace-nowrap p-4"><div className="flex flex-nowrap items-center gap-3 whitespace-nowrap"><ActionForm action={async () => { "use server"; return toggleProductPublication(product.id, product.is_active); }} feedbackPlacement="toast" successMessage={product.is_active ? "تم إيقاف نشر المنتج." : "تم نشر المنتج بنجاح."}><SubmitButton pendingLabel={product.is_active ? "جارٍ الإيقاف..." : "جارٍ النشر..."} ariaLabel={product.is_active ? "إيقاف نشر المنتج" : "نشر المنتج"} className={`inline-flex h-10 w-32 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${product.is_active ? "border border-border bg-white text-text hover:bg-slate-50" : "bg-primary text-white hover:bg-primary-hover"}`}>{product.is_active ? "إيقاف النشر" : "نشر"}</SubmitButton></ActionForm><Link href={`/admin/products/${product.id}`} className="text-xs font-medium text-primary hover:underline">تعديل</Link><ActionForm action={async () => { "use server"; return deleteProduct(product.id); }} feedbackPlacement="toast" successMessage="تم حذف المنتج."><ConfirmSubmit compact message="سيتم حذف المنتج نهائيًا من قائمة المنتجات. تبقى بيانات الطلبات السابقة محفوظة." className="text-xs font-medium text-error hover:underline">حذف</ConfirmSubmit></ActionForm></div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      )}
      {!productsError && (count ?? 0) > pageSize ? <nav aria-label="صفحات المنتجات" className="flex items-center justify-between rounded-xl border border-border bg-white p-4 text-sm"><span className="text-muted">صفحة {page} من {Math.ceil((count ?? 0) / pageSize)}</span><div className="flex gap-2">{page > 1 ? <Link href={{ query: { ...params, page: String(page - 1) } }} className="rounded-lg border border-border px-4 py-2">السابق</Link> : null}{page < Math.ceil((count ?? 0) / pageSize) ? <Link href={{ query: { ...params, page: String(page + 1) } }} className="rounded-lg border border-border px-4 py-2">التالي</Link> : null}</div></nav> : null}
    </div>
  );
}
