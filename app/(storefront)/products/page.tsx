import Link from "next/link";
import { getColors, getMaterials, searchProducts } from "@/lib/queries/storefront";
import { ProductCardView } from "@/components/storefront/product-card";
import { ProductFilters } from "@/components/storefront/product-filters";

type SearchValues = { q?: string; category?: string; discounted?: string; featured?: string; sort?: string };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    discounted?: string;
    featured?: string;
    sort?: string;
    page?: string;
    storefrontSearch?: string;
  }>;
}) {
  const params = await searchParams;
  const queryText = params.storefrontSearch ?? params.q;
  const filterParams = { ...params, q: queryText };
  const sort = (params.sort as "newest" | "price_asc" | "price_desc" | "relevance") ?? undefined;
  const [result, colors, materials] = await Promise.all([
    searchProducts({
      q: queryText,
      category: params.category,
      discounted: params.discounted === "1",
      featured: params.featured === "1",
      sort,
      page: params.page ? Number(params.page) : 1,
    }),
    getColors(),
    getMaterials(),
  ]);
  const defaultColor = colors.find((color) => color.is_default) ?? colors[0] ?? null;
  const defaultMaterial = materials.find((material) => material.is_default) ?? materials[0] ?? null;

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  return (
    <div className="space-y-6">
      <ProductFilters params={filterParams} />

      {result.items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-muted">
          لا توجد منتجات مطابقة.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {result.items.map((product) => (
            <ProductCardView key={product.id} product={product} defaultColor={defaultColor} defaultMaterial={defaultMaterial} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <Link
              key={page}
              href={{ pathname: "/products", query: { ...params, page: String(page) } }}
              className={`rounded-md border px-3 py-1 ${page === result.page ? "border-primary text-primary" : "border-border"}`}
            >
              {page}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
