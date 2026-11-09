"use client";

import { useRouter } from "next/navigation";

type FilterParams = {
  q?: string;
  category?: string;
  discounted?: string;
  featured?: string;
  sort?: string;
};

export function ProductFilters({ params }: { params: FilterParams }) {
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
    <form dir="rtl" onChange={applyFilters} className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <input type="hidden" name="q" value={params.q ?? ""} />
      {params.featured === "1" ? <input type="hidden" name="featured" value="1" /> : null}
      {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
      <label className="inline-flex shrink-0 items-center gap-2 font-medium text-muted" htmlFor="product-sort">ترتيب حسب
        <select id="product-sort" name="sort" defaultValue={params.sort ?? "newest"} className="min-h-10 w-40 rounded-lg border border-border bg-white px-2.5 text-sm font-normal text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15">
          <option value="newest">الأحدث</option>
          <option value="price_asc">السعر من الأقل</option>
          <option value="price_desc">السعر من الأعلى</option>
          {params.q ? <option value="relevance">الأكثر صلة</option> : null}
        </select>
      </label>
      <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap text-sm font-medium text-text">
        <input type="checkbox" name="discounted" value="1" defaultChecked={params.discounted === "1"} className="h-4 w-4 shrink-0 accent-primary" />
        <span>عروض الخصم فقط</span>
      </label>
    </form>
  );
}
