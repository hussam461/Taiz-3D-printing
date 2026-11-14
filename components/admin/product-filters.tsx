"use client";

const controlClass = "min-h-10 rounded-lg border border-border bg-white px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15";

export function ProductFilters({ categories, values }: { categories: { id: string; name: string }[]; values: { q?: string; category?: string; status?: string; sort?: string; featured?: string } }) {
  return <section className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4">
    <form method="get" action="/admin/products" className="space-y-3">
      <div className="flex min-w-0 items-center gap-2">
        <input name="q" defaultValue={values.q} placeholder="ابحث باسم المنتج..." aria-label="بحث باسم المنتج" className={`${controlClass} min-w-0 flex-1`} />
        <button type="submit" className="min-h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover">بحث</button>
        <label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-text sm:px-3 sm:text-sm">
          <input type="checkbox" name="featured" value="1" defaultChecked={values.featured === "1"} className="h-4 w-4 accent-primary" onChange={(event) => event.currentTarget.form?.requestSubmit()} />
          مميزة
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-border pt-3">
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted sm:text-xs">التصنيف<select name="category" defaultValue={values.category ?? ""} className={`${controlClass} w-full min-w-0 px-2 text-xs sm:px-3 sm:text-sm`} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">الكل</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted sm:text-xs">النشر<select name="status" defaultValue={values.status ?? ""} className={`${controlClass} w-full min-w-0 px-2 text-xs sm:px-3 sm:text-sm`} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">الكل</option><option value="active">منشور</option><option value="inactive">مسودة</option></select></label>
        <label className="grid min-w-0 gap-1 text-[11px] font-medium text-muted sm:text-xs">الترتيب<select name="sort" defaultValue={values.sort ?? "newest"} className={`${controlClass} w-full min-w-0 px-2 text-xs sm:px-3 sm:text-sm`} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="newest">الأحدث</option><option value="name">الاسم</option><option value="price">الأقل سعرًا</option><option value="price_desc">الأعلى سعرًا</option></select></label>
      </div>
    </form>
  </section>;
}
