"use client";

import Link from "next/link";

const controlClass = "rounded-lg border border-border bg-white px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/15";

export function ProductFilters({ categories, values }: { categories: { id: string; name: string }[]; values: { q?: string; category?: string; status?: string; sort?: string; featured?: string } }) {
  return <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
    <div className="mb-4"><h2 className="font-semibold">بحث وتصفية</h2><p className="mt-1 text-xs text-muted">غيّر التصنيف أو الحالة أو الترتيب لتتحدث النتائج مباشرة. البحث النصي يعمل عند الضغط على بحث.</p></div>
    <form method="get" action="/admin/products" className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto] lg:items-end">
      <label className="grid gap-1.5 text-xs font-medium text-muted">بحث باسم المنتج<input name="q" defaultValue={values.q} placeholder="مثال: حامل أقلام" className={controlClass} /></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">التصنيف<select name="category" defaultValue={values.category ?? ""} className={controlClass} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">كل التصنيفات</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">حالة النشر<select name="status" defaultValue={values.status ?? ""} className={controlClass} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="">كل الحالات</option><option value="active">منشور وفعال</option><option value="inactive">مسودة / غير فعال</option></select></label>
      <label className="grid gap-1.5 text-xs font-medium text-muted">ترتيب النتائج<select name="sort" defaultValue={values.sort ?? "newest"} className={controlClass} onChange={(event) => event.currentTarget.form?.requestSubmit()}><option value="newest">الأحدث إضافة</option><option value="name">الاسم (أ-ي)</option><option value="price">السعر (من الأقل للأعلى)</option><option value="price_desc">السعر (من الأعلى للأقل)</option></select></label>
      <div className="flex items-center gap-2"><label className="flex h-11 items-center gap-2 whitespace-nowrap rounded-lg border border-border px-3 text-sm"><input type="checkbox" name="featured" value="1" defaultChecked={values.featured === "1"} className="h-4 w-4 accent-primary" onChange={(event) => event.currentTarget.form?.requestSubmit()} /> مميزة</label><button type="submit" className="h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover">بحث</button><Link href="/admin/products" className="h-11 rounded-lg border border-border px-3 py-3 text-sm">مسح</Link></div>
    </form>
  </section>;
}
