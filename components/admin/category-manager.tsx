"use client";

import { useEffect, useState } from "react";
import { saveSimpleRow, deleteSimpleRow } from "@/lib/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

type Category = { id: string; name: string; slug: string; is_active: boolean; sort_order: number; product_count: number };

export function CategoryManager({ rows }: { rows: Category[] }) {
  const [blockedDeleteId, setBlockedDeleteId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!blockedDeleteId) return;
    const alert = document.getElementById("category-delete-alert");
    if (alert) {
      alert.scrollIntoView({ behavior: "smooth", block: "center" });
      alert.focus({ preventScroll: true });
    }
    const timer = window.setTimeout(() => setBlockedDeleteId(null), 5000);
    const dismissOnPointer = () => setBlockedDeleteId(null);
    document.addEventListener("pointerdown", dismissOnPointer);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", dismissOnPointer);
    };
  }, [blockedDeleteId]);
  const save = saveSimpleRow.bind(null, "categories");

  return <div className="space-y-6">
    <div className="flex justify-start">
      <button type="button" aria-expanded={createOpen} onClick={() => setCreateOpen((open) => !open)} className="ms-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"><span aria-hidden="true" className="text-lg leading-none">+</span>إضافة تصنيف</button>
    </div>
    {createOpen ? <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <ActionForm action={save} successMessage="تمت إضافة التصنيف." resetOnSuccess onSuccess={() => setCreateOpen(false)} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-sm font-semibold">اسم التصنيف
          <input name="name" required maxLength={80} placeholder="مثال: ديكورات منزلية" className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" />
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-4 text-sm font-medium sm:min-w-36">
          <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
          إظهار في المتجر
        </label>
        <SubmitButton pendingLabel="جارٍ الإضافة..." className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:col-span-2 sm:justify-self-end">
          <span aria-hidden="true" className="text-lg leading-none">+</span> إضافة التصنيف
        </SubmitButton>
      </ActionForm>
    </section> : null}

    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h2 className="text-lg font-bold">التصنيفات الحالية</h2><p className="mt-1 text-sm text-muted">عدّل الاسم أو حالة الظهور مباشرة.</p></div>
      </div>

      {rows.length ? <div className="grid gap-3 xl:grid-cols-2">
        {rows.map((category) => <article key={category.id} className="rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-5">
          <ActionForm action={save} successMessage="تم تحديث التصنيف." className="space-y-4" onSuccess={() => setDirtyRows((current) => ({ ...current, [category.id]: false }))} onChange={(event) => {
            const form = event.currentTarget;
            const name = (form.elements.namedItem("name") as HTMLInputElement).value;
            const active = (form.elements.namedItem("is_active") as HTMLInputElement).checked;
            const changed = name !== category.name || active !== category.is_active;
            setDirtyRows((current) => current[category.id] === changed ? current : { ...current, [category.id]: changed });
          }}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="current_slug" value={category.slug} />
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-primary"><CategoryIcon /></span>
                <div className="min-w-0"><p className="text-xs text-muted">تصنيف المتجر</p><p className="truncate text-sm font-semibold">{category.name}</p></div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${category.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{category.is_active ? "ظاهر" : "مخفي"}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="text-xs font-semibold text-muted">اسم التصنيف
                <input name="name" required maxLength={80} defaultValue={category.name} className="mt-1.5 min-h-11 w-full rounded-xl border border-border px-3 text-sm font-medium text-text outline-none focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" />
              </label>
              <label className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-50 px-3 text-xs font-medium">
                <input type="checkbox" name="is_active" defaultChecked={category.is_active} className="h-4 w-4 accent-teal-600" />
                ظاهر للعملاء
              </label>
            </div>
            <div className="flex justify-end border-t border-border pt-3">
              <SubmitButton disabled={!dirtyRows[category.id]} pendingLabel="جارٍ الحفظ..." className="min-h-10 rounded-xl border border-teal-700 px-4 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400">حفظ التعديلات</SubmitButton>
            </div>
          </ActionForm>
          {category.product_count > 0 ? <div className="mt-3">
            <button type="button" onClick={() => setBlockedDeleteId(blockedDeleteId === category.id ? null : category.id)} className="min-h-9 rounded-lg px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">حذف التصنيف</button>
            {blockedDeleteId === category.id ? <div id="category-delete-alert" role="alert" tabIndex={-1} className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="mt-0.5 h-5 w-5 shrink-0"><path d="M12 3 2.8 19h18.4L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="M12 9v4m0 3h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
              <span>لا يمكن حذف هذا التصنيف لأنه مرتبط بـ <strong>{category.product_count.toLocaleString("ar-YE-u-nu-latn")} {category.product_count === 1 ? "منتج" : "منتجات"}</strong>. لإزالته من المتجر، أوقف خيار «ظاهر للعملاء» ثم احفظ التعديل.</span>
            </div> : null}
          </div> : <ActionForm action={deleteSimpleRow.bind(null, "categories", category.id)} successMessage="تم حذف التصنيف." className="mt-2 flex justify-start">
            <ConfirmSubmit message="هل تريد حذف هذا التصنيف؟ لا يمكن التراجع عن العملية." className="min-h-9 rounded-lg px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50">حذف التصنيف</ConfirmSubmit>
          </ActionForm>}
        </article>)}
      </div> : <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-muted"><CategoryIcon /></span><p className="mt-3 font-semibold">لا توجد تصنيفات بعد</p><p className="mt-1 text-sm text-muted">أضف أول تصنيف ليبدأ تنظيم منتجات المتجر.</p></div>}
    </section>
  </div>;
}

function CategoryIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 14.5h6.5V21H4zM13.5 14.5H20V21h-6.5z" /></svg>;
}
