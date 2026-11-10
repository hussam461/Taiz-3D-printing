"use client";

import Image from "next/image";
import { useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { upsertProduct } from "@/lib/admin/actions";
import { FeedbackNotice } from "@/components/admin/feedback-notice";
import { publicMediaUrl } from "@/lib/storage/public-url";
import {
  PRODUCT_IMAGE_MIME_TYPES,
  parseProductForm,
  validateProductImageMetadata,
  type ProductFieldErrors,
} from "@/lib/validation/product";

const inputClass = "w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm text-text shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus:ring-red-500/10";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  base_price_old_yer: number;
  discount_percent: number | null;
  is_active: boolean;
  is_featured: boolean;
  specifications: unknown;
  seo_title: string | null;
  seo_description: string | null;
  updated_at?: string;
};

type ProductImage = { storage_path: string; alt_text: string | null; is_main: boolean };
type SpecRow = { id: number; label: string; value: string };
type ActionState =
  | { ok: true; productId: string; created: boolean }
  | { ok: false; error: string; fieldErrors?: ProductFieldErrors }
  | null;

const initialState: ActionState = null;

function initialSpecifications(value: unknown): SpecRow[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as { label?: unknown; value?: unknown };
    if (typeof row.label !== "string" || typeof row.value !== "string") return [];
    return [{ id: index + 1, label: row.label, value: row.value }];
  });
}

function Field({
  id,
  label,
  required,
  optional,
  hint,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className={`grid content-start gap-2 ${className}`}>
      <label htmlFor={id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-text">
        <span>{label}{required ? <span className="ms-1 text-error" aria-hidden="true">*</span> : null}</span>
        {optional ? <span className="text-xs font-normal text-muted">اختياري</span> : null}
      </label>
      {children}
      {hint ? <p id={hintId} className="text-xs leading-5 text-muted">{hint}</p> : null}
      {error ? <p id={errorId} className="flex items-start gap-1.5 text-xs font-medium leading-5 text-error" role="alert"><span aria-hidden="true">!</span>{error}</p> : null}
    </div>
  );
}

export function ProductForm({
  categories,
  product,
  currentImage,
  legacyImageCount = 0,
  createdNotice = false,
}: {
  categories: { id: string; name: string }[];
  product?: Product;
  currentImage?: ProductImage | null;
  legacyImageCount?: number;
  createdNotice?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const successToastRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectedFileRef = useRef<File | null>(null);
  const submissionLock = useRef(false);
  const lastFieldValues = useRef<Map<string, string | boolean | Array<string | boolean>>>(new Map());
  const [actionState, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => upsertProduct(previous, formData),
    initialState,
  );
  const [fieldErrors, setFieldErrors] = useState<ProductFieldErrors>({});
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(
    createdNotice ? { tone: "success", message: "تم إنشاء المنتج بنجاح." } : null,
  );
  const [successToastPaused, setSuccessToastPaused] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [hasSavedSuccessfully, setHasSavedSuccessfully] = useState(createdNotice);
  const [formDirty, setFormDirty] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [willPublish, setWillPublish] = useState(product?.is_active ?? false);
  const [specRows, setSpecRows] = useState<SpecRow[]>(() => initialSpecifications(product?.specifications));
  const nextSpecId = useRef(specRows.reduce((maximum, row) => Math.max(maximum, row.id), 0) + 1);
  const currentImageUrl = publicMediaUrl(currentImage?.storage_path ?? null);

  useEffect(() => {
    if (feedback?.tone !== "success" || successToastPaused) return;
    const timer = window.setTimeout(() => setFeedback(null), 4500);
    return () => window.clearTimeout(timer);
  }, [feedback, successToastPaused]);

  useEffect(() => {
    if (feedback?.tone !== "success") return;
    const dismissOnOutsidePress = (event: PointerEvent) => {
      if (event.target instanceof Node && !successToastRef.current?.contains(event.target)) {
        setFeedback(null);
      }
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFeedback(null);
    };
    document.addEventListener("pointerdown", dismissOnOutsidePress);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutsidePress);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [feedback]);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    const timer = window.setTimeout(() => setPreviewUrl(url), 0);
    return () => { window.clearTimeout(timer); URL.revokeObjectURL(url); };
  }, [selectedFile]);

  useEffect(() => {
    if (!actionState) return;
    const timer = window.setTimeout(() => {
      submissionLock.current = false;
      if (actionState.ok) {
        setFieldErrors({});
        setHasSavedSuccessfully(true);
        setFormDirty(false);
        // The server confirmed the upload/save. Clear the file so a later data-only
        // save cannot upload the same image again.
        selectedFileRef.current = null;
        setSelectedFile(null);
        setPreviewUrl(null);
        if (imageInputRef.current) imageInputRef.current.value = "";
        if (actionState.created) router.replace(`/admin/products/${actionState.productId}?saved=created`);
        else setFeedback({ tone: "success", message: "تم تحديث المنتج بنجاح." });
        router.refresh();
        return;
      }
      setFieldErrors(actionState.fieldErrors ?? {});
      setFeedback({ tone: "error", message: actionState.error });
      const form = formRef.current;
      if (!form) return;
      for (const [name, savedValue] of lastFieldValues.current) {
        const controls = Array.from(form.elements).filter((element) => (element as HTMLInputElement).name === name) as HTMLInputElement[];
        if (!controls.length) continue;
        if (Array.isArray(savedValue)) {
          controls.forEach((control, index) => {
            if (control.type === "checkbox") control.checked = Boolean(savedValue[index]);
            else if (savedValue[index] !== undefined) control.value = String(savedValue[index]);
          });
        } else {
          const control = controls[0];
          if (control.type === "checkbox") control.checked = Boolean(savedValue);
          else control.value = String(savedValue);
        }
      }
      if (selectedFileRef.current && imageInputRef.current) {
        const transfer = new DataTransfer();
        transfer.items.add(selectedFileRef.current);
        imageInputRef.current.files = transfer.files;
      }
      const firstError = Object.keys(actionState.fieldErrors ?? {})[0];
      if (firstError) window.setTimeout(() => document.getElementById(firstError)?.focus(), 0);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [actionState, router]);

  function focusField(name: string) {
    const target = name === "image" ? imageInputRef.current : document.getElementById(name);
    target?.focus();
  }

  function clearFieldError(name: keyof ProductFieldErrors) {
    setFieldErrors((current) => {
      if (!current[name]) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
    setFeedback(null);
  }

  function acceptFile(file: File | undefined) {
    if (!file) return;
    const error = validateProductImageMetadata(file);
    if (error) {
      setFieldErrors((current) => ({ ...current, image: error }));
      setFeedback({ tone: "error", message: "لم تُحفظ الصورة. صحح المشكلة الموضحة في قسم الصورة." });
      return;
    }
    // Dropped files update the preview, but must also be assigned to the real
    // file input so the browser includes them in the submitted FormData.
    if (imageInputRef.current && imageInputRef.current.files?.[0] !== file) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      imageInputRef.current.files = transfer.files;
    }
    selectedFileRef.current = file;
    setSelectedFile(file);
    setFormDirty(true);
    clearFieldError("image");
  }

  function rememberValues(form: HTMLFormElement) {
    const values = new Map<string, string | boolean | Array<string | boolean>>();
    const controls = Array.from(form.elements).filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement => "name" in element && Boolean((element as HTMLInputElement).name));
    for (const name of new Set(controls.map((control) => control.name))) {
      if (name === "product_image") continue;
      const namedControls = controls.filter((control) => control.name === name);
      if (namedControls.length > 1) {
        values.set(name, namedControls.map((control) => control.type === "checkbox" ? (control as HTMLInputElement).checked : control.value));
      } else {
        const control = namedControls[0];
        values.set(name, control.type === "checkbox" ? (control as HTMLInputElement).checked : control.value);
      }
    }
    lastFieldValues.current = values;
  }

  function validateBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    if (submissionLock.current) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = parseProductForm(formData);
    const nextErrors: ProductFieldErrors = parsed.success ? {} : parsed.fieldErrors;
    const file = imageInputRef.current?.files?.[0] ?? null;
    const isActive = formData.get("is_active") === "on";

    if (file) {
      const imageError = validateProductImageMetadata(file);
      if (imageError) nextErrors.image = imageError;
    } else if (isActive && !currentImage) {
      nextErrors.image = "أضف صورة قبل نشر المنتج.";
    }

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
      setFieldErrors(nextErrors);
      setFeedback({
        tone: "error",
        message: isActive ? "لا يمكن نشر المنتج بعد. أكمل الحقول التالية." : "راجع الحقول المحددة قبل حفظ المنتج.",
      });
      const firstError = Object.keys(nextErrors)[0];
      window.setTimeout(() => focusField(firstError), 0);
      return;
    }

    setFieldErrors({});
    setFeedback(null);
    rememberValues(form);
    submissionLock.current = true;
  }

  const fieldNames: Record<keyof ProductFieldErrors, string> = {
    name: "اسم المنتج",
    description: "الوصف",
    category_id: "التصنيف",
    base_price_old_yer: "السعر الأساسي",
    discount_percent: "نسبة الخصم",
    image: "صورة المنتج",
    specifications: "المواصفات",
  };

  return (
    <form ref={formRef} action={formAction} noValidate onChange={() => setFormDirty(true)} onSubmit={validateBeforeSubmit} className="max-w-5xl space-y-6">
      {product ? <><input type="hidden" name="id" value={product.id} /><input type="hidden" name="current_slug" value={product.slug} /></> : null}

      {feedback?.tone === "success" ? (
        <div ref={successToastRef} className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-[100] mx-auto max-w-lg md:inset-x-auto md:end-6 md:w-[min(28rem,calc(100vw-3rem))]">
          <FeedbackNotice
            tone="success"
            message={feedback.message}
            onDismiss={() => setFeedback(null)}
            className="shadow-2xl"
            onMouseEnter={() => setSuccessToastPaused(true)}
            onMouseLeave={() => setSuccessToastPaused(false)}
            onFocus={() => setSuccessToastPaused(true)}
            onBlur={() => setSuccessToastPaused(false)}
          />
        </div>
      ) : null}
      {feedback?.tone === "error" ? (
        <div>
          <FeedbackNotice tone="error" message={feedback.message} onDismiss={() => setFeedback(null)} />
          {feedback.tone === "error" && Object.keys(fieldErrors).length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-error">
              {Object.entries(fieldErrors).map(([name, error]) => (
                <li key={name}><button type="button" onClick={() => focusField(name)} className="underline underline-offset-2 focus-visible:outline focus-visible:outline-2">{fieldNames[name as keyof ProductFieldErrors]}: {error}</button></li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm md:p-7">
        <header className="mb-6 border-b border-border pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">معلومات المنتج</p>
          <h2 className="mt-1 text-xl font-bold">التفاصيل الأساسية</h2>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5">
          <Field id="name" label="اسم المنتج" required error={fieldErrors.name}>
            <input id="name" name="name" defaultValue={product?.name ?? ""} required minLength={2} maxLength={120} autoComplete="off" aria-required="true" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "name-error" : "name-hint"} placeholder="مثال: حامل أقلام مكتبي" className={inputClass} onChange={() => clearFieldError("name")} />
          </Field>
          <Field id="category_id" label="التصنيف" required error={fieldErrors.category_id}>
            <select id="category_id" name="category_id" defaultValue={product?.category_id ?? ""} required aria-required="true" aria-invalid={Boolean(fieldErrors.category_id)} aria-describedby={fieldErrors.category_id ? "category_id-error" : "category_id-hint"} className={inputClass} onChange={() => clearFieldError("category_id")}>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {categories.length === 0 ? <p className="text-xs text-warning">لا توجد تصنيفات متاحة. أنشئ تصنيفًا أولًا قبل حفظ المنتج.</p> : null}
          </Field>
          <Field id="description" label="وصف المنتج" required error={fieldErrors.description} className="col-span-2">
            <textarea id="description" name="description" defaultValue={product?.description ?? ""} required rows={3} maxLength={5000} aria-required="true" aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? "description-error" : undefined} placeholder="اكتب وصف المنتج" className={inputClass} onChange={() => clearFieldError("description")} />
          </Field>
          <div className="col-span-2 grid grid-cols-2 items-start gap-3 sm:gap-4">
            <Field id="base_price_old_yer" label="السعر الأساسي" required error={fieldErrors.base_price_old_yer}>
              <div className="relative">
              <input id="base_price_old_yer" name="base_price_old_yer" type="number" inputMode="numeric" min={0} step={1} required defaultValue={product?.base_price_old_yer ?? ""} aria-required="true" aria-invalid={Boolean(fieldErrors.base_price_old_yer)} aria-describedby={fieldErrors.base_price_old_yer ? "base_price_old_yer-error" : undefined} placeholder="أدخل السعر" className={`${inputClass} pe-24`} onChange={() => clearFieldError("base_price_old_yer")} />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[10px] text-muted sm:end-4 sm:text-xs">ر.ي قديم</span>
              </div>
            </Field>
            <Field id="discount_percent" label="نسبة الخصم" optional error={fieldErrors.discount_percent}>
              <div className="relative">
                <input id="discount_percent" name="discount_percent" type="number" inputMode="decimal" min={0} max={100} step="0.01" defaultValue={product?.discount_percent ?? ""} aria-invalid={Boolean(fieldErrors.discount_percent)} aria-describedby={fieldErrors.discount_percent ? "discount_percent-error" : "discount_percent-hint"} placeholder="بدون خصم" className={`${inputClass} pe-10`} onChange={() => clearFieldError("discount_percent")} />
                <span className="pointer-events-none absolute inset-y-0 end-4 flex items-center text-sm text-muted">٪</span>
              </div>
            </Field>
          </div>
          <div className="col-span-2 grid grid-cols-2 gap-2 sm:gap-3">
            <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 transition hover:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 sm:gap-3 sm:px-4">
              <input type="checkbox" name="is_active" checked={willPublish} onChange={(event) => setWillPublish(event.currentTarget.checked)} className="h-4 w-4 shrink-0 rounded accent-primary" />
              <span className="text-xs font-semibold sm:text-sm">نشط</span>
            </label>
            <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 transition hover:border-primary/40 focus-within:ring-4 focus-within:ring-primary/10 sm:gap-3 sm:px-4">
              <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} className="h-4 w-4 shrink-0 rounded accent-primary" />
              <span className="text-xs font-semibold sm:text-sm">منتج مميز</span>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-primary/20 bg-primary/[0.025] p-5 shadow-sm md:p-7">
        <header className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">وسائط المنتج</p>
            <h2 className="mt-1 text-xl font-bold">صورة المنتج</h2>
            <p id="product-image-hint" className="mt-2 text-sm leading-6 text-muted">صورة واحدة فقط بصيغة JPG أو PNG أو WebP، بحد أقصى 5MB. تُحفظ الصورة الجديدة عند حفظ المنتج.</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${willPublish ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-muted"}`}>{willPublish ? "مطلوبة للنشر" : "اختيارية للمسودة"}</span>
        </header>
        <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <label htmlFor="product_image" className="text-sm font-semibold">{currentImage ? "الصورة الحالية" : "اختر صورة المنتج"}{willPublish ? <span className="ms-1 text-error" aria-hidden="true">*</span> : null}</label>
            <div className={`flex min-h-48 flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${isDragging ? "border-primary bg-blue-50" : "border-border bg-white"}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); acceptFile(event.dataTransfer.files[0]); }}>
              <svg aria-hidden="true" viewBox="0 0 40 40" fill="none" className="mb-3 h-10 w-10 text-primary"><rect x="5" y="7" width="30" height="26" rx="4" stroke="currentColor" strokeWidth="1.6" /><circle cx="15" cy="16" r="2.5" stroke="currentColor" strokeWidth="1.5" /><path d="m8 29 9-8 6 5 4-3 5 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <p className="text-sm font-semibold">اسحب صورة إلى هنا أو اخترها من جهازك</p>
              <button type="button" onClick={() => imageInputRef.current?.click()} className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{currentImage ? "استبدال الصورة" : "اختيار صورة"}</button>
              <label htmlFor="product_image" className="sr-only">صورة المنتج بصيغة JPG أو PNG أو WebP وبحجم لا يتجاوز 5MB</label>
              <input ref={imageInputRef} id="product_image" name="product_image" type="file" accept={PRODUCT_IMAGE_MIME_TYPES.join(",")} required={willPublish && !currentImage && !selectedFile} aria-required={willPublish} aria-describedby={fieldErrors.image ? "product-image-error" : "product-image-hint"} aria-invalid={Boolean(fieldErrors.image)} className="sr-only" onChange={(event) => acceptFile(event.currentTarget.files?.[0])} />
            </div>
            {fieldErrors.image ? <p id="product-image-error" className="text-sm font-medium text-error" role="alert">{fieldErrors.image}</p> : null}
            {selectedFile ? <button type="button" onClick={() => { selectedFileRef.current = null; setSelectedFile(null); if (imageInputRef.current) imageInputRef.current.value = ""; clearFieldError("image"); }} className="text-sm font-semibold text-muted underline underline-offset-4 transition hover:text-text">إلغاء الاستبدال والعودة للصورة الحالية</button> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {currentImage && !selectedFile ? (
              <figure className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  {currentImageUrl ? <Image src={currentImageUrl} alt={currentImage.alt_text || product?.name || "صورة المنتج الحالية"} fill sizes="(max-width: 768px) 100vw, 30vw" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted">تعذرت معاينة الصورة</div>}
                  <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm">الصورة الحالية</span>
                </div>
                <figcaption className="p-3 text-xs text-muted">سيبقى الملف الحالي كما هو ما لم تختر صورة بديلة.</figcaption>
              </figure>
            ) : null}
            {selectedFile && previewUrl ? (
              <figure className="overflow-hidden rounded-2xl border border-primary/30 bg-white shadow-sm">
                <div className="relative aspect-[4/3] bg-slate-100">
                  <Image src={previewUrl} alt={`معاينة الصورة الجديدة: ${selectedFile.name}`} fill sizes="(max-width: 768px) 100vw, 30vw" unoptimized className="object-cover" />
                  <span className="absolute start-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary shadow-sm">معاينة البديل</span>
                </div>
                <figcaption className="space-y-1 p-3 text-xs text-muted"><p className="truncate font-medium text-text" title={selectedFile.name}>{selectedFile.name}</p><p>{formatFileSize(selectedFile.size)} · لن تُرفع إلا عند حفظ المنتج</p></figcaption>
              </figure>
            ) : null}
            {!currentImage && !selectedFile ? <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-2xl border border-border bg-white p-4 text-center text-sm text-muted"><span className="mb-2 rounded-full bg-slate-100 p-3"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" stroke="currentColor" strokeWidth="1.5" /><path d="m6 17 4-4 3 3 2-2 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></span><span>ستظهر معاينة الصورة هنا</span></div> : null}
          </div>
        </div>
        {legacyImageCount > 1 ? <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-950">توجد صور قديمة إضافية لهذا المنتج. لن تظهر في الواجهة الجديدة ولن نحذفها تلقائيًا حتى لا تتأثر مراجع الطلبات السابقة.</p> : null}
      </section>

      <section className="rounded-3xl border border-border bg-surface p-5 shadow-sm md:p-7">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-primary">اختياري</p><h2 className="mt-1 text-xl font-bold">المواصفات وتحسين الظهور</h2></div>
        </header>
        <div className="space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">مواصفات المنتج <span className="font-normal text-muted">اختياري</span></h3><button type="button" onClick={() => { setSpecRows((rows) => [...rows, { id: nextSpecId.current++, label: "", value: "" }]); setFormDirty(true); }} className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-primary transition hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">إضافة مواصفة</button></div>
            {specRows.length > 0 ? <div className="space-y-3">{specRows.map((row, index) => <div key={row.id} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1.2fr_auto] sm:items-end"><div className="grid gap-1.5"><label htmlFor={`spec-label-${row.id}`} className="text-xs font-medium">اسم المواصفة</label><input id={`spec-label-${row.id}`} name="specification_label" value={row.label} onChange={(event) => setSpecRows((rows) => rows.map((item) => item.id === row.id ? { ...item, label: event.target.value } : item))} placeholder="مثال: الخامة" className={inputClass} /></div><div className="grid gap-1.5"><label htmlFor={`spec-value-${row.id}`} className="text-xs font-medium">القيمة</label><input id={`spec-value-${row.id}`} name="specification_value" value={row.value} onChange={(event) => setSpecRows((rows) => rows.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))} placeholder="مثال: PLA" className={inputClass} /></div><button type="button" onClick={() => { setSpecRows((rows) => rows.filter((item) => item.id !== row.id)); setFormDirty(true); }} aria-label={`حذف المواصفة ${index + 1}`} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-error transition hover:bg-red-50 focus-visible:outline focus-visible:outline-2">إزالة</button></div>)}</div> : null}
            {fieldErrors.specifications ? <p className="mt-2 text-xs font-medium text-error" role="alert">{fieldErrors.specifications}</p> : null}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Field id="seo_title" label="عنوان نتائج البحث" optional><input id="seo_title" name="seo_title" defaultValue={product?.seo_title ?? ""} maxLength={160} placeholder="اسم المنتج تلقائيًا" className={inputClass} /></Field>
            <Field id="seo_description" label="وصف نتائج البحث" optional><textarea id="seo_description" name="seo_description" defaultValue={product?.seo_description ?? ""} rows={2} maxLength={320} placeholder="وصف مختصر للبحث" className={inputClass} /></Field>
          </div>
        </div>
      </section>

      <footer className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/95 p-3 shadow-lg backdrop-blur sm:px-5">
        <p className="text-xs text-muted">{product?.updated_at ? `آخر تعديل: ${new Intl.DateTimeFormat("ar-YE-u-nu-latn", { dateStyle: "medium", timeStyle: "short" }).format(new Date(product.updated_at))}` : "راجع البيانات والصورة قبل الحفظ."}</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={pending} onClick={() => router.push("/admin/products")} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-slate-50 disabled:opacity-60">إلغاء</button>
          <button type="submit" disabled={pending || (hasSavedSuccessfully && !formDirty)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />جارٍ الحفظ...</> : hasSavedSuccessfully && !formDirty ? "تم الحفظ" : "حفظ المنتج"}
          </button>
        </div>
      </footer>
    </form>
  );
}

function formatFileSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)}MB` : `${Math.max(1, Math.ceil(bytes / 1024))}KB`;
}
