import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const supabase = await createServerSupabase();
  const [{ data: product, error: productError }, { data: categories }, { data: images }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
    supabase.from("product_images").select("id, storage_path, alt_text, is_main").eq("product_id", id).order("is_main", { ascending: false }).order("sort_order").order("created_at"),
  ]);
  if (productError || !product) notFound();
  const productImages = images ?? [];
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="الكتالوج / تعديل" title={product.name} description="راجع بيانات المنتج وصورته الحالية، ثم احفظ التغييرات عند الانتهاء." />
      <ProductForm categories={categories ?? []} product={product} currentImage={productImages[0] ?? null} legacyImageCount={productImages.length} createdNotice={query.saved === "created"} />
    </div>
  );
}
