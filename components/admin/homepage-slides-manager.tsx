"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { deleteHomepageSlide, reorderHomepageSlides, saveHomepageSlide } from "@/lib/admin/actions";
import { PRODUCT_IMAGE_MIME_TYPES, validateProductImageMetadata } from "@/lib/validation/product";
import type { HomepageSlide } from "@/lib/queries/storefront";

type AdminSlide = HomepageSlide & { is_published: boolean; sort_order: number; image_url: string | null };
const input = "mt-1 w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-2 focus:ring-primary/15";

export function HomepageSlidesManager({ slides }: { slides: AdminSlide[] }) {
  const [adding, setAdding] = useState(false);
  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="font-medium text-muted">عدد الشرائح <strong className="ms-1 text-navy">{slides.length} / 8</strong></span>{slides.length < 8 ? <button type="button" aria-expanded={adding} onClick={() => setAdding((open) => !open)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover"><span aria-hidden="true" className="text-lg leading-none">{adding ? "×" : "+"}</span>{adding ? "إلغاء الإضافة" : "إضافة شريحة"}</button> : null}</div>
    {adding && slides.length < 8 ? <SlideEditor onClose={() => setAdding(false)} onSaved={() => setAdding(false)} /> : null}
    {slides.map((slide, index) => <SlideEditor key={slide.id} slide={slide} index={index} slides={slides} />)}
    {slides.length >= 8 ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">وصلت إلى الحد الأقصى. احذف شريحة لإضافة أخرى.</p> : null}
  </div>;
}

function SlideEditor({ slide, index, slides = [], onClose, onSaved }: { slide?: AdminSlide; index?: number; slides?: AdminSlide[]; onClose?: () => void; onSaved?: () => void }) {
  const [editing, setEditing] = useState(!slide);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  useEffect(() => {
    if (slide) return;
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    titleInputRef.current?.focus({ preventScroll: true });
  }, [slide]);
  const chooseFile = (file: File | null) => {
    if (!file) return;
    const validationError = validateProductImageMetadata(file);
    if (validationError) {
      setImageError(validationError);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = null;
      setPreview(null);
      setSelectedFile(null);
      if (imageInputRef.current) imageInputRef.current.value = "";
      return;
    }
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    if (imageInputRef.current && imageInputRef.current.files?.[0] !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      imageInputRef.current.files = transfer.files;
    }
    setSelectedFile(file);
    setImageError(null);
    setPreview(previewUrl.current);
  };
  const clearPreview = () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null;
    setPreview(null);
    setSelectedFile(null);
    setImageError(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };
  const currentImage = preview ?? slide?.image_url ?? null;
  const order = slides.map((item) => item.id);
  const move = (direction: -1 | 1) => {
    const target = (index ?? 0) + direction;
    if (target < 0 || target >= order.length) return;
    [order[target - direction], order[target]] = [order[target], order[target - direction]];
    return order;
  };

  const slideActions = slide ? <div className="flex flex-wrap items-center gap-2">
    {slides.length > 1 ? <>
      <ActionForm action={reorderHomepageSlides} hideFeedback><input type="hidden" name="slide_ids" value={JSON.stringify(move(-1) ?? order)} /><SubmitButton pendingLabel="..." ariaLabel="تحريك الشريحة للأعلى" disabled={index === 0} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-navy hover:bg-slate-50 disabled:opacity-40">↑</SubmitButton></ActionForm>
      <ActionForm action={reorderHomepageSlides} hideFeedback><input type="hidden" name="slide_ids" value={JSON.stringify(move(1) ?? order)} /><SubmitButton pendingLabel="..." ariaLabel="تحريك الشريحة للأسفل" disabled={index === slides.length - 1} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white text-navy hover:bg-slate-50 disabled:opacity-40">↓</SubmitButton></ActionForm>
    </> : null}
    {editing ? <button type="button" onClick={() => { clearPreview(); setEditing(false); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-slate-100">إلغاء</button> : <button type="button" onClick={() => setEditing(true)} className="inline-flex min-h-9 items-center rounded-lg border border-border bg-white px-3 text-sm font-semibold text-primary transition hover:bg-blue-50">تعديل</button>}
    <ActionForm action={async () => deleteHomepageSlide(slide.id)} successMessage="تم حذف الشريحة." feedbackPlacement="toast">
      <ConfirmSubmit message="سيتم حذف الشريحة وصورتها من المعرض." className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50" compact>حذف</ConfirmSubmit>
    </ActionForm>
  </div> : onClose ? <button type="button" onClick={onClose} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-slate-100 hover:text-text">إلغاء</button> : null;

  if (slide && !editing) return <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2"><h2 className="font-semibold text-navy">الشريحة {Number(index) + 1}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${slide.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{slide.is_published ? "منشورة" : "مسودة"}</span></div>
      {slideActions}
    </div>
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="relative aspect-[2.7/1] w-full shrink-0 overflow-hidden rounded-xl bg-navy sm:w-56">{slide.image_url ? <Image src={slide.image_url} alt="" fill sizes="224px" unoptimized className="object-cover object-center" /> : <span className="flex h-full items-center justify-center text-xs text-white/70">لا توجد صورة</span>}</div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-navy">{slide.title?.trim() || "بدون عنوان نصي"}</p>
        {slide.description?.trim() ? <p className="mt-1 line-clamp-2 leading-6 text-muted">{slide.description}</p> : null}
        {slide.href ? <p dir="ltr" className="mt-2 truncate text-start text-xs text-primary">{slide.href}</p> : null}
      </div>
    </div>
  </section>;

  return <section ref={sectionRef} className="scroll-mt-24 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-50/80 px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2"><h2 className="font-semibold text-navy">{slide ? `الشريحة ${Number(index) + 1}` : "إضافة شريحة"}</h2>{slide ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${slide.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{slide.is_published ? "منشورة" : "مسودة"}</span> : null}</div>
      {slideActions}
    </div>
    <ActionForm action={saveHomepageSlide} successMessage={slide ? "تم تحديث الشريحة." : "تمت إضافة الشريحة."} feedbackPlacement="toast" resetOnSuccess={!slide} onSuccess={() => { clearPreview(); if (slide) setEditing(false); onSaved?.(); }} className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      {slide ? <input type="hidden" name="id" value={slide.id} /> : null}
      <div className="grid content-start gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-navy">عنوان الشريحة <span className="font-normal text-muted">اختياري</span><input ref={titleInputRef} name="title" maxLength={120} defaultValue={slide?.title ?? ""} placeholder="مثال: نصنع أفكارك بدقة" className={input} /><span className="mt-1 block text-xs font-normal text-muted">إذا تركته فارغًا، ستظهر الصورة بدون عنوان.</span></label>
        <label className="block text-sm font-medium text-navy">رابط عند الضغط على الشريحة <span className="font-normal text-muted">اختياري</span><input name="href" type="text" dir="ltr" maxLength={500} defaultValue={slide?.href ?? ""} placeholder="/products أو https://..." className={input} /><span className="mt-1 block text-xs font-normal text-muted">يجعل الشريحة قابلة للضغط ويفتح هذا الرابط.</span></label>
        <label className="block text-sm font-medium text-navy sm:col-span-2">وصف قصير <span className="font-normal text-muted">اختياري</span><textarea name="description" maxLength={240} rows={2} defaultValue={slide?.description ?? ""} placeholder="رسالة قصيرة تظهر مع العنوان" className={input} /></label>
        <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium text-navy sm:col-span-2"><input name="is_published" type="checkbox" defaultChecked={slide?.is_published ?? false} className="h-4 w-4 accent-primary" />نشر الشريحة على الصفحة الرئيسية</label>
        <SubmitButton disabled={!slide && !selectedFile} pendingLabel={slide ? "جارٍ الحفظ..." : "جارٍ الإضافة..."} className="min-h-11 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover sm:col-span-2 sm:justify-self-start">{slide ? "حفظ التعديلات" : "إضافة الشريحة"}</SubmitButton>
      </div>
      <div className="order-first space-y-3 lg:order-none">
        <div className={`relative flex aspect-[2.7/1] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition ${isDragging ? "border-primary bg-blue-50" : "border-border bg-slate-50"}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); chooseFile(event.dataTransfer.files[0] ?? null); }}>
          <input ref={imageInputRef} name="slide_image" type="file" accept={PRODUCT_IMAGE_MIME_TYPES.join(",")} required={!slide && !selectedFile} onChange={(event) => chooseFile(event.currentTarget.files?.[0] ?? null)} className="sr-only" aria-label="صورة الشريحة بصيغة JPG أو PNG أو WebP، بحد أقصى 5 ميغابايت" />
          {currentImage ? <Image src={currentImage} alt="" fill sizes="(max-width: 1024px) 100vw, 300px" unoptimized className="bg-navy object-cover object-center" /> : <div className="px-4 text-center text-muted"><span aria-hidden="true" className="text-3xl">▧</span><p className="mt-1 text-sm font-semibold">اسحب الصورة إلى هنا</p><p className="mt-1 text-xs">أو اخترها من جهازك</p></div>}
          {slide && !selectedFile && currentImage ? <span className="absolute start-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">الصورة الحالية</span> : null}
          {selectedFile ? <span className="absolute start-2 top-2 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-primary shadow-sm">معاينة الصورة الجديدة</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => imageInputRef.current?.click()} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-primary px-4 text-sm font-semibold text-primary transition hover:bg-blue-50">{selectedFile || slide?.image_url ? "استبدال الصورة" : "اختيار صورة"}</button>
          {selectedFile ? <button type="button" onClick={clearPreview} className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-muted underline underline-offset-4 hover:text-text">{slide?.image_url ? "إلغاء الاستبدال" : "إزالة الصورة"}</button> : null}
        </div>
        {imageError ? <p className="text-sm font-medium text-red-700" role="alert">{imageError}</p> : null}
        {selectedFile ? <p className="truncate text-xs text-muted" title={selectedFile.name}>{selectedFile.name} · {formatFileSize(selectedFile.size)} · تُرفع عند الحفظ</p> : <p className="text-xs leading-5 text-muted">JPG أو PNG أو WebP، بحد أقصى 5MB. الأفضل 1920 × 750 بكسل؛ حافظ على العنصر الأساسي في المنتصف لأن الأطراف تُقص قليلًا على الجوال. الصورة الحالية تبقى ما لم تختر بديلًا.</p>}
      </div>
    </ActionForm>
  </section>;
}

function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
