import { ProductForm } from "@/components/admin/product-form";
import { createServerSupabase } from "@/lib/supabase/server";
import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";

export default async function NewProductPage() {
  const supabase = await createServerSupabase();
  const { data: categories } = await supabase.from("categories").select("id, name").order("sort_order");
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="الكتالوج / منتج جديد" title="إضافة منتج" description="أدخل بيانات المنتج واختر صورته، ثم احفظه كمسودة أو انشره للمتجر." />
      {(categories ?? []).length === 0 ? <section className="max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-semibold text-amber-950">أضف تصنيفًا أولًا</h2><p className="mt-2 text-sm leading-6 text-amber-900">لا يمكن إنشاء منتج دون ربطه بتصنيف. أنشئ تصنيفًا ثم عد إلى هذه الصفحة.</p><Link href="/admin/categories" className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">إدارة التصنيفات</Link></section> : <ProductForm categories={categories ?? []} />}
    </div>
  );
}
