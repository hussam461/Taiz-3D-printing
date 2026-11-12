"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { saveCategory, deleteSimpleRow, saveStoreSettings } from "@/lib/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SaveChangesForm } from "@/components/admin/save-changes-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { PRODUCT_IMAGE_MIME_TYPES } from "@/lib/validation/product";

type Category = { id: string; name: string; slug: string; is_active: boolean; sort_order: number; product_count: number; image_url: string | null };

export function CategoryManager({ rows, allProductsImageUrl, customOrderImageUrl }: { rows: Category[]; allProductsImageUrl: string | null; customOrderImageUrl: string | null }) {
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
  return <div className="space-y-6">
    <SaveChangesForm action={saveStoreSettings} successMessage="تم حفظ صور بطاقات الاختصار." title="صور بطاقات الاختصار" description="هذه الصور تخص بطاقتي «جميع المنتجات» و«طلب مخصص» اللتين تظهران بجانب التصنيفات في الصفحة الرئيسية. مقاس 800 × 600 بكسل مناسب." buttonLabel="حفظ التعديلات">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[
          { name: "all_products_image", removeName: "remove_all_products_image", title: "جميع المنتجات", url: allProductsImageUrl },
          { name: "custom_order_image", removeName: "remove_custom_order_image", title: "طلب مخصص", url: customOrderImageUrl },
        ].map((card) => <article key={card.name} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md sm:p-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {card.url ? <Image src={card.url} alt={`صورة بطاقة ${card.title}`} fill sizes="(max-width: 639px) 45vw, 300px" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-primary"><CategoryIcon /></div>}
            <span className={`absolute start-2 top-2 rounded-full px-2 py-1 text-[9px] font-semibold sm:text-[10px] ${card.url ? "bg-emerald-50/95 text-emerald-700" : "bg-slate-100/95 text-slate-600"}`}>{card.url ? "لها صورة" : "بدون صورة"}</span>
          </div>
          <h3 className="mt-2 truncate text-xs font-semibold text-navy sm:text-sm">{card.title}</h3>
          <input id={`shortcut-image-${card.name}`} name={card.name} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={`صورة بطاقة ${card.title}`} />
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <label htmlFor={`shortcut-image-${card.name}`} className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-border px-1.5 text-[10px] font-semibold text-primary transition hover:bg-blue-50 sm:text-xs">{card.url ? "تغيير الصورة" : "إضافة صورة"}</label>
            {card.url ? <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-1 text-[10px] font-semibold text-rose-700 sm:text-xs"><input type="checkbox" name={card.removeName} className="h-3.5 w-3.5 accent-rose-600" />حذف الصورة</label> : <span className="flex items-center justify-center text-[9px] text-muted">حتى 5MB</span>}
          </div>
          <p className="mt-1 text-[9px] leading-4 text-muted sm:text-[10px]">JPG أو PNG أو WebP · حتى 5MB</p>
        </article>)}
      </div>
    </SaveChangesForm>
    <div className="flex justify-start">
      <button type="button" aria-expanded={createOpen} onClick={() => setCreateOpen((open) => !open)} className="ms-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"><span aria-hidden="true" className="text-lg leading-none">+</span>إضافة تصنيف</button>
    </div>
    {createOpen ? <section className="rounded-2xl border border-border bg-white p-4 shadow-sm sm:p-5">
      <ActionForm action={saveCategory} successMessage="تمت إضافة التصنيف." resetOnSuccess onSuccess={() => setCreateOpen(false)} className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="text-sm font-semibold">اسم التصنيف
          <input name="name" required maxLength={80} placeholder="مثال: ديكورات منزلية" className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-4 text-sm outline-none transition placeholder:text-muted/70 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/10" />
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-4 text-sm font-medium sm:min-w-36">
          <input name="is_active" type="checkbox" defaultChecked className="h-4 w-4 accent-teal-600" />
          إظهار في المتجر
        </label>
        <label className="col-span-2 text-sm font-medium sm:col-span-1">صورة التصنيف <span className="font-normal text-muted">اختيارية</span>
          <input name="category_image" type="file" accept={PRODUCT_IMAGE_MIME_TYPES.join(",")} className="mt-1.5 block w-full text-xs text-muted file:me-3 file:min-h-10 file:rounded-lg file:border file:border-border file:bg-white file:px-3 file:font-semibold file:text-primary" />
          <span className="mt-1 block text-xs font-normal text-muted">JPG أو PNG أو WebP، بحد أقصى 5MB. الأفضل صورة أفقية 800 × 600 بكسل.</span>
        </label>
        <div className="col-span-2 flex justify-end gap-2">
          <button type="button" onClick={(event) => { event.currentTarget.form?.reset(); setCreateOpen(false); }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-muted transition hover:bg-slate-50">إلغاء</button>
          <SubmitButton pendingLabel="جارٍ الإضافة..." className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            <span aria-hidden="true" className="text-lg leading-none">+</span> إضافة التصنيف
          </SubmitButton>
        </div>
      </ActionForm>
    </section> : null}

    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="text-lg font-bold">التصنيفات الحالية</h2><p className="mt-1 text-sm text-muted">عدّل الاسم والصورة وحالة الظهور.</p></div>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-muted">{rows.length} تصنيف</span>
      </div>

      {rows.length ? <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        {rows.map((category) => <article key={category.id} className="min-w-0 overflow-hidden rounded-2xl border border-border bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md sm:p-4">
          <ActionForm action={saveCategory} successMessage="تم تحديث التصنيف." className="space-y-2.5 sm:space-y-3" onSuccess={() => setDirtyRows((current) => ({ ...current, [category.id]: false }))} onChange={(event) => {
            const form = event.currentTarget;
            const name = (form.elements.namedItem("name") as HTMLInputElement).value;
            const active = (form.elements.namedItem("is_active") as HTMLInputElement).checked;
            const imageSelected = Boolean((form.elements.namedItem("category_image") as HTMLInputElement).files?.length);
            const removeImage = (form.elements.namedItem("remove_category_image") as HTMLInputElement | null)?.checked ?? false;
            const changed = name !== category.name || active !== category.is_active || imageSelected || removeImage;
            setDirtyRows((current) => current[category.id] === changed ? current : { ...current, [category.id]: changed });
          }}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="current_slug" value={category.slug} />
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
              {category.image_url ? <Image src={category.image_url} alt={`صورة ${category.name}`} fill sizes="(max-width: 639px) 45vw, 300px" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-primary"><CategoryIcon /></div>}
              <span className={`absolute start-2 top-2 rounded-full px-2 py-1 text-[10px] font-semibold ${category.is_active ? "bg-emerald-50/95 text-emerald-700" : "bg-slate-100/95 text-slate-600"}`}>{category.is_active ? "ظاهر" : "مخفي"}</span>
            </div>
            <label className="block text-[11px] font-semibold text-muted sm:text-xs">اسم التصنيف
              <input name="name" required maxLength={80} defaultValue={category.name} className="mt-1 min-h-10 w-full min-w-0 rounded-lg border border-border px-2 text-xs font-medium text-text outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10 sm:px-3 sm:text-sm" />
            </label>
            <div className="flex items-center justify-between gap-1 text-[10px] sm:text-xs">
              <label className="flex min-h-9 min-w-0 items-center gap-1.5 font-medium text-text">
                <input type="checkbox" name="is_active" defaultChecked={category.is_active} className="h-4 w-4 shrink-0 accent-teal-600" />
                <span className="truncate">ظاهر للعملاء</span>
              </label>
              <span className="shrink-0 text-muted">{category.product_count} منتج</span>
            </div>
            <input id={`category-image-${category.id}`} name="category_image" type="file" accept={PRODUCT_IMAGE_MIME_TYPES.join(",")} className="sr-only" aria-label={`صورة التصنيف ${category.name}`} />
            <div className="grid grid-cols-2 gap-1.5">
              <label htmlFor={`category-image-${category.id}`} className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-border px-1.5 text-[10px] font-semibold text-primary transition hover:bg-blue-50 sm:text-xs">{category.image_url ? "تغيير الصورة" : "إضافة صورة"}</label>
              {category.image_url ? <label className="inline-flex min-h-9 cursor-pointer items-center justify-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-1 text-[10px] font-semibold text-rose-700 sm:text-xs"><input type="checkbox" name="remove_category_image" className="h-3.5 w-3.5 accent-rose-600" />حذف الصورة</label> : <span className="flex items-center justify-center text-[9px] text-muted">حتى 5MB</span>}
            </div>
            <SubmitButton disabled={!dirtyRows[category.id]} pendingLabel="جارٍ الحفظ..." className="min-h-9 w-full rounded-lg bg-primary px-2 text-xs font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">حفظ التعديلات</SubmitButton>
          </ActionForm>
          {category.product_count > 0 ? <div className="mt-2 border-t border-border pt-2">
            <button type="button" onClick={() => setBlockedDeleteId(blockedDeleteId === category.id ? null : category.id)} className="min-h-8 w-full rounded-lg px-2 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50 sm:text-xs">حذف التصنيف</button>
            {blockedDeleteId === category.id ? <div id="category-delete-alert" role="alert" tabIndex={-1} className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-950 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 sm:text-xs">
              لا يمكن حذفه لارتباطه بـ <strong>{category.product_count.toLocaleString("ar-YE-u-nu-latn")} منتج</strong>. أخفِ التصنيف بدلًا من ذلك.
            </div> : null}
          </div> : <ActionForm action={deleteSimpleRow.bind(null, "categories", category.id)} successMessage="تم حذف التصنيف." className="mt-2 border-t border-border pt-2">
            <ConfirmSubmit compact spinnerOnly pendingLabel="جارٍ حذف التصنيف" message="هل تريد حذف هذا التصنيف؟ لا يمكن التراجع عن العملية." className="min-h-8 w-full rounded-lg px-2 text-[10px] font-semibold text-rose-600 transition hover:bg-rose-50 sm:text-xs">حذف التصنيف</ConfirmSubmit>
          </ActionForm>}
        </article>)}
      </div> : <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-12 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-muted"><CategoryIcon /></span><p className="mt-3 font-semibold">لا توجد تصنيفات بعد</p><p className="mt-1 text-sm text-muted">أضف أول تصنيف ليبدأ تنظيم منتجات المتجر.</p></div>}
    </section>
  </div>;
}

function CategoryIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5"><path d="M4 5.5h6.5V12H4zM13.5 5.5H20V12h-6.5zM4 14.5h6.5V21H4zM13.5 14.5H20V21h-6.5z" /></svg>;
}
