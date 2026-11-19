"use client";

import { useRouter } from "next/navigation";
import type { Category } from "@/lib/queries/storefront";

type FilterParams = {
  q?: string;
  category?: string;
  discounted?: string;
  featured?: string;
  sort?: string;
};

export function ProductFilters({ params, categories }: { params: FilterParams; categories: Category[] }) {
  const router = useRouter();

  function applyFilters(event: React.ChangeEvent<HTMLFormElement>) {
    const query = new URLSearchParams();
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string" && value) query.set(key, value);
    });
    query.delete("page");
    const search = query.toString();
    router.replace(search ? `/products?${search}` : "/products", { scroll: false });
  }

  return (
    <form dir="rtl" onChange={applyFilters} className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-1 text-[10px] sm:flex sm:w-auto sm:flex-nowrap sm:gap-3 sm:text-sm">
      <input type="hidden" name="q" value={params.q ?? ""} />
      {params.featured === "1" ? <input type="hidden" name="featured" value="1" /> : null}
      <label className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto sm:shrink-0" htmlFor="product-category">
        <span className="px-1 text-[10px] leading-3 text-muted sm:text-xs">التصنيف</span>
        <select id="product-category" name="category" defaultValue={params.category ?? ""} className="min-h-9 w-full min-w-0 rounded-lg border border-border bg-white px-1 text-[10px] text-text sm:min-h-10 sm:w-40 sm:px-2.5 sm:text-sm">
          <option value="">كل التصنيفات</option>
          {categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}
        </select>
      </label>
      <label className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto sm:shrink-0" htmlFor="product-sort">
        <span className="px-1 text-[10px] leading-3 text-muted sm:text-xs">ترتيب حسب</span>
        <select id="product-sort" name="sort" defaultValue={params.sort ?? "newest"} className="min-h-9 w-full min-w-0 rounded-lg border border-border bg-white px-1 text-[10px] font-normal text-text sm:min-h-10 sm:w-40 sm:px-2.5 sm:text-sm">
          <option value="newest">الأحدث</option>
          <option value="price_asc">السعر من الأقل</option>
          <option value="price_desc">السعر من الأعلى</option>
          {params.q ? <option value="relevance">الأكثر صلة</option> : null}
        </select>
      </label>
      <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap text-[10px] font-medium text-text sm:min-h-10 sm:justify-start sm:gap-2 sm:text-sm">
        <input type="checkbox" name="discounted" value="1" defaultChecked={params.discounted === "1"} className="h-4 w-4 shrink-0 accent-primary" />
        <span>عروض الخصم فقط</span>
      </label>
    </form>
  );
}
