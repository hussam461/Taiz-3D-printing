import { CategoryManager } from "@/components/admin/category-manager";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const [{ data }, { data: productRows }] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("products").select("category_id").not("category_id", "is", null),
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
      <CategoryManager rows={(data ?? []).map((row) => ({ ...row, product_count: productCounts.get(row.id) ?? 0 })) as { id: string; name: string; slug: string; is_active: boolean; sort_order: number; product_count: number }[]} />
    </div>
  );
}
