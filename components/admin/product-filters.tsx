"use client";

import Link from "next/link";
import { useState } from "react";

const controlClass = "rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15";

export function ProductFilters({ categories, values }: { categories: { id: string; name: string }[]; values: { q?: string; category?: string; status?: string; sort?: string; featured?: string } }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = [values.q, values.category, values.status, values.featured === "1", values.sort && values.sort !== "newest"].filter(Boolean).length;
  return <section className="rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-5">
    <div className="mb-3 flex items-center justify-between gap-3 lg:mb-4">
      <div><h2 className="font-semibold">بحث وتصفية</h2><p className="mt-1 hidden text-xs text-muted sm:block">البحث النصي عند الضغط على بحث، وتتحدث القوائم مباشرة عند تغييرها.</p></div>
      <button type="button" aria-expanded={filtersOpen} aria-controls="admin-product-filter-fields" onClick={() => setFiltersOpen((open) => !open)} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-white px-3 text-xs font-semibold text-text transition hover:bg-slate-50 lg:hidden">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M4 6h16M7 12h10m-7 6h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        الفلاتر{activeFilterCount ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">{activeFilterCount}</span> : null}
      </button>
    </div>
    {filtersOpen ? <button type="button" aria-label="إغلاق الفلاتر" onClick={() => setFiltersOpen(false)} className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" /> : null}
    <form id="admin-product-filter-fields" method="get" action="/admin/products" className={`${filtersOpen ? "fixed inset-x-0 bottom-0 z-50 grid max-h-[85dvh] overflow-y-auto rounded-t-2xl border border-border bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl lg:static lg:max-h-none lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none" : "hidden lg:grid"} grid-cols-2 gap-2.5 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end lg:gap-3`}>
      <div className="col-span-2 flex items-center justify-between border-b border-border pb-3 lg:hidden"><div><h3 className="font-semibold text-text">تصفية المنتجات</h3><p className="mt-1 text-xs text-muted">اختر ما تريد عرضه</p></div><button type="button" onClick={() => setFiltersOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text">إغلاق</button></div>
      <label className="col-span-2 grid gap-1.5 text-xs font-medium text-muted lg:col-span-1">بحث باسم المنتج<input name="q" defaultValue={values.q} placeholder="مثال: حامل أقلام" className={controlClass} /></label>
      <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted">التصنيف<select name="category" defaultValue={values.category ?? ""} className={controlClass} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">كل التصنيفات</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="grid min-w-0 gap-1.5 text-xs font-medium text-muted">حالة النشر<select name="status" defaultValue={values.status ?? ""} className={controlClass} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">كل الحالات</option><option value="active">منشور وفعال</option><option value="inactive">مسودة / غير فعال</option></select></label>
      <label className="col-span-2 grid gap-1.5 text-xs font-medium text-muted lg:col-span-1">ترتيب النتائج<select name="sort" defaultValue={values.sort ?? "newest"} className={controlClass} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="newest">الأحدث إضافة</option><option value="name">الاسم (أ-ي)</option><option value="price">السعر (من الأقل للأعلى)</option><option value="price_desc">السعر (من الأعلى للأقل)</option></select></label>
      <div className="col-span-2 flex items-center justify-between gap-2 lg:col-span-1 lg:justify-start"><label className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-white px-3 text-sm"><input type="checkbox" name="featured" value="1" defaultChecked={values.featured === "1"} className="h-4 w-4 accent-primary" onChange={(event) => event.currentTarget.form?.requestSubmit()} /> مميزة</label><div className="flex items-center gap-2"><button type="submit" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover">بحث</button><Link href="/admin/products" className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-3 text-sm">مسح</Link></div></div>
    </form>
  </section>;
}
