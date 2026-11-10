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
    <form dir="rtl" onChange={applyFilters} className="flex flex-nowrap items-center gap-2 text-xs sm:gap-3 sm:text-sm">
      <input type="hidden" name="q" value={params.q ?? ""} />
      {params.featured === "1" ? <input type="hidden" name="featured" value="1" /> : null}
      {params.category ? <input type="hidden" name="category" value={params.category} /> : null}
      <label className="inline-flex shrink-0 items-center gap-1 font-medium text-muted sm:gap-2" htmlFor="product-sort">ترتيب حسب
        <select id="product-sort" name="sort" defaultValue={params.sort ?? "newest"} className="min-h-10 w-24 rounded-lg border border-border bg-white px-1.5 text-xs font-normal text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 sm:w-40 sm:px-2.5 sm:text-sm">
          <option value="newest">الأحدث</option>
          <option value="price_asc">السعر من الأقل</option>
          <option value="price_desc">السعر من الأعلى</option>
          {params.q ? <option value="relevance">الأكثر صلة</option> : null}
        </select>
      </label>
      <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs font-medium text-text sm:gap-2 sm:text-sm">
        <input type="checkbox" name="discounted" value="1" defaultChecked={params.discounted === "1"} className="h-4 w-4 shrink-0 accent-primary" />
        <span>عروض الخصم فقط</span>
      </label>
    </form>
  );
}
