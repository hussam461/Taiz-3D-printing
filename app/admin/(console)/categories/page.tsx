import { CategoryManager } from "@/components/admin/category-manager";
import { createServerSupabase } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/storage/public-url";

export default async function Page() {
  const supabase = await createServerSupabase();
  const [{ data }, { data: productRows }, { data: storeSettings }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("category_id").not("category_id", "is", null),
    supabase.from("store_settings").select("all_products_image_path, custom_order_image_path").eq("id", 1).maybeSingle(),
  ]);
  const productCounts = new Map<string, number>();
  for (const row of productRows ?? []) {
    if (row.category_id) productCounts.set(row.category_id, (productCounts.get(row.category_id) ?? 0) + 1);
  }
  return (
    <div>
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">كتالوج المتجر</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">إدارة التصنيفات</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">أنشئ تصنيفات واضحة، وتحكم بظهورها، وسهّل على العملاء العثور على المنتجات.</p>
      </div>
      <CategoryManager
        rows={(data ?? []).map((row) => ({ ...row, image_url: publicMediaUrl(row.image_path, "store-assets"), product_count: productCounts.get(row.id) ?? 0 })) as { id: string; name: string; slug: string; is_active: boolean; sort_order: number; product_count: number; image_url: string | null }[]}
        allProductsImageUrl={publicMediaUrl(storeSettings?.all_products_image_path ?? null, "store-assets")}
        customOrderImageUrl={publicMediaUrl(storeSettings?.custom_order_image_path ?? null, "store-assets")}
      />
    </div>
  );
}
