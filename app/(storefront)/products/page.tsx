import { getActiveCategories, getColors, getMaterials, searchProducts } from "@/lib/queries/storefront";
import { ProductResults } from "@/components/storefront/product-results";
import { ProductFilters } from "@/components/storefront/product-filters";
import Link from "next/link";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    discounted?: string;
    featured?: string;
    sort?: string;
    storefrontSearch?: string;
  }>;
}) {
  const params = await searchParams;
  const queryText = params.storefrontSearch ?? params.q;
  const filterParams = { ...params, q: queryText };
  const sort = (params.sort as "newest" | "price_asc" | "price_desc" | "relevance") ?? undefined;
  const [result, colors, materials, categories] = await Promise.all([
    searchProducts({
      q: queryText,
      category: params.category,
      discounted: params.discounted === "1",
      featured: params.featured === "1",
      sort,
      page: 1,
    }),
    getColors(),
    getMaterials(),
    getActiveCategories(),
  ]);
  const selectedCategory = categories.find((category) => category.slug === params.category) ?? null;
  const defaultColor = colors.find((color) => color.is_default) ?? colors[0] ?? null;
  const defaultMaterial = materials.find((material) => material.is_default) ?? materials[0] ?? null;
  const resultsKey = JSON.stringify([
    queryText ?? "",
    params.category ?? "",
    params.discounted === "1",
    params.featured === "1",
    sort ?? "",
  ]);

  return (
    <div className="space-y-6">
      <nav aria-label="مسار الصفحة" className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/" className="transition hover:text-primary">الرئيسية</Link>
        <span aria-hidden="true">›</span>
        {selectedCategory ? <><Link href="/products" className="transition hover:text-primary">جميع المنتجات</Link><span aria-hidden="true">›</span><span aria-current="page" className="font-medium text-text">{selectedCategory.name}</span></> : <span aria-current="page" className="font-medium text-text">جميع المنتجات</span>}
      </nav>
      <ProductFilters params={filterParams} />
      {result.items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          لا توجد منتجات مطابقة.
        </p>
      ) : (
        <ProductResults
          key={resultsKey}
          initialItems={result.items}
          total={result.total}
          filters={{
            q: queryText,
            category: params.category,
            discounted: params.discounted === "1",
            featured: params.featured === "1",
            sort,
          }}
          defaultColor={defaultColor ? { id: defaultColor.id, name: defaultColor.name } : null}
          defaultMaterial={defaultMaterial ? { id: defaultMaterial.id, name: defaultMaterial.name } : null}
        />
      )}
    </div>
  );
}
