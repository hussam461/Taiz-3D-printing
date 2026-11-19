"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/queries/storefront";
import { StorefrontSelect } from "@/components/storefront/storefront-select";

type FilterParams = {
  q?: string;
  category?: string;
  discounted?: string;
  featured?: string;
  sort?: string;
};

export function ProductFilters({ params, categories }: { params: FilterParams; categories: Category[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  function applyFilters(event: React.ChangeEvent<HTMLFormElement>) {
    navigate(new FormData(event.currentTarget));
  }

  function navigate(data: FormData) {
    const query = new URLSearchParams();
    data.forEach((value, key) => {
      if (typeof value === "string" && value) query.set(key, value);
    });
    query.delete("page");
    const search = query.toString();
    router.replace(search ? `/products?${search}` : "/products", { scroll: false });
  }

  function applyCategory(category: string) {
    applyValue("category", category);
  }

  function applySort(sort: string) {
    applyValue("sort", sort);
  }

  function applyValue(name: string, value: string) {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    if (value) data.set(name, value);
    else data.delete(name);
    navigate(data);
  }

  return (
    <form ref={formRef} dir="rtl" onChange={applyFilters} className="grid w-full grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-1 text-[10px] sm:flex sm:w-auto sm:flex-nowrap sm:gap-3 sm:text-sm">
      <input type="hidden" name="q" value={params.q ?? ""} />
      {params.featured === "1" ? <input type="hidden" name="featured" value="1" /> : null}
      <input type="hidden" name="category" value={params.category ?? ""} />
      <input type="hidden" name="sort" value={params.sort ?? "newest"} />
      <div className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto sm:shrink-0">
        <span id="product-category-label" className="px-1 text-[10px] leading-3 text-muted sm:text-xs">التصنيف</span>
        <StorefrontSelect
          ariaLabel="التصنيف"
          value={params.category ?? ""}
          options={[{ value: "", label: "كل التصنيفات" }, ...categories.map((category) => ({ value: category.slug, label: category.name }))]}
          onChange={applyCategory}
          disabled={categories.length === 0}
          triggerClassName="min-h-9 w-full rounded-xl border border-border bg-white px-2 text-[10px] shadow-sm hover:border-primary/40 sm:min-h-10 sm:w-40 sm:px-2.5 sm:text-sm"
        />
      </div>
      <div className="flex w-full min-w-0 flex-col gap-0.5 sm:w-auto sm:shrink-0">
        <span className="px-1 text-[10px] leading-3 text-muted sm:text-xs">ترتيب حسب</span>
        <StorefrontSelect
          ariaLabel="ترتيب المنتجات"
          value={params.sort ?? "newest"}
          options={[{ value: "newest", label: "الأحدث" }, { value: "price_asc", label: "السعر من الأقل" }, { value: "price_desc", label: "السعر من الأعلى" }, ...(params.q ? [{ value: "relevance", label: "الأكثر صلة" }] : [])]}
          onChange={applySort}
          triggerClassName="min-h-9 w-full rounded-xl border border-border bg-white px-2 text-[10px] shadow-sm hover:border-primary/40 sm:min-h-10 sm:w-40 sm:px-2.5 sm:text-sm"
        />
      </div>
      <label className="inline-flex min-h-9 shrink-0 cursor-pointer items-center justify-center gap-1 whitespace-nowrap text-[10px] font-medium text-text sm:min-h-10 sm:justify-start sm:gap-2 sm:text-sm">
        <input type="checkbox" name="discounted" value="1" defaultChecked={params.discounted === "1"} className="h-4 w-4 shrink-0 accent-primary" />
        <span>عروض الخصم فقط</span>
      </label>
    </form>
  );
}
