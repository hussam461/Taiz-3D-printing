"use client";

import { useState } from "react";
import type { ProductCard } from "@/lib/queries/storefront";
import { ProductCardView } from "@/components/storefront/product-card";

type ProductFilters = {
  q?: string;
  category?: string;
  discounted?: boolean;
  featured?: boolean;
  sort?: string;
};

type ProductPageResponse = {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
};

export function ProductResults({
  initialItems,
  total,
  filters,
  defaultColor,
  defaultMaterial,
}: {
  initialItems: ProductCard[];
  total: number;
  filters: ProductFilters;
  defaultColor: { id: string; name: string } | null;
  defaultMaterial: { id: string; name: string } | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [loadedPage, setLoadedPage] = useState(1);
  const [totalItems, setTotalItems] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const hasMore = items.length < totalItems;

  async function loadMore() {
    if (loading || !hasMore) return;
    setLoading(true);
    setError(null);
    setStatus("");
    const params = new URLSearchParams({ page: String(loadedPage + 1) });
    if (filters.q) params.set("q", filters.q);
    if (filters.category) params.set("category", filters.category);
    if (filters.discounted) params.set("discounted", "1");
    if (filters.featured) params.set("featured", "1");
    if (filters.sort) params.set("sort", filters.sort);

    try {
      const response = await fetch(`/api/storefront/products?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error("تعذر تحميل المنتجات الآن. حاول مرة أخرى.");
      const result = (await response.json()) as ProductPageResponse;
      setItems((current) => {
        const existing = new Set(current.map((product) => product.id));
        return [...current, ...result.items.filter((product) => !existing.has(product.id))];
      });
      setStatus(result.items.length ? `تم تحميل ${result.items.length} منتج إضافي.` : "لا توجد منتجات أخرى لعرضها.");
      setLoadedPage(result.page);
      setTotalItems(result.total);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل المنتجات الآن. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((product) => (
          <div key={product.id} className="motion-safe:animate-[product-card-enter_350ms_ease-out_both]">
            <ProductCardView product={product} defaultColor={defaultColor} defaultMaterial={defaultMaterial} />
          </div>
        ))}
      </div>
      {error ? <p role="alert" className="text-center text-sm text-error">{error}</p> : null}
      {hasMore ? (
        <div className="flex flex-col items-center gap-3 pt-2">
          <button type="button" onClick={loadMore} disabled={loading} className="inline-flex min-h-12 min-w-40 items-center justify-center gap-2 rounded-xl border border-primary bg-white px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60">
            {loading ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary motion-reduce:animate-none" />جارٍ تحميل المنتجات...</> : error ? "إعادة المحاولة" : "عرض المزيد"}
          </button>
          <p className="text-xs text-muted">عُرض {items.length} من {totalItems} منتجًا</p>
          <p aria-live="polite" className="sr-only">{status}</p>
        </div>
      ) : items.length > 0 ? (
        <p aria-live="polite" className="pt-2 text-center text-sm text-muted">لا يوجد المزيد لعرضه.</p>
      ) : null}
    </>
  );
}
