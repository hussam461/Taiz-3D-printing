"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useTransition } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ProductDeleteButton, ProductDeleteProvider } from "@/components/admin/product-delete-button";
import { deleteProduct, loadMoreAdminProducts, toggleProductPublication } from "@/lib/admin/actions";
import { publicMediaUrl } from "@/lib/storage/public-url";

type Product = {
  id: string;
  name: string;
  slug: string;
  base_price_old_yer: number;
  discount_percent: number | null;
  is_active: boolean;
  is_featured: boolean;
  product_categories?: { categories?: { name?: string } | { name?: string }[] | null }[];
  product_images?: { storage_path: string; is_main: boolean }[];
};

type Filters = { q?: string; category?: string; status?: string; sort?: string; featured?: string };

function categoryNames(product: Product) {
  return (product.product_categories ?? []).map((relation) => {
    const category = Array.isArray(relation.categories) ? relation.categories[0] : relation.categories;
    return category?.name;
  }).filter((name): name is string => Boolean(name)).join("، ");
}

function ProductActions({ product }: { product: Product }) {
  return <div className="flex items-center gap-2">
    <ActionForm action={() => toggleProductPublication(product.id, product.is_active)} feedbackPlacement="toast" successMessage="تم تحديث حالة نشر المنتج.">
      <SubmitButton spinnerOnly pendingLabel="جارٍ تحديث حالة النشر" ariaLabel={product.is_active ? "إيقاف نشر المنتج" : "نشر المنتج"} className={`inline-flex h-9 min-w-10 items-center justify-center rounded-lg px-2 text-xs font-semibold transition ${product.is_active ? "border border-border bg-white text-text hover:bg-slate-50" : "bg-primary text-white hover:bg-primary-hover"}`}>{product.is_active ? "إيقاف" : "نشر"}</SubmitButton>
    </ActionForm>
    <Link href={`/admin/products/${product.id}`} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border px-3 text-xs font-semibold text-primary">تعديل</Link>
    <ProductDeleteButton action={deleteProduct.bind(null, product.id)} />
  </div>;
}

function ProductRows({ products }: { products: Product[] }) {
  return <>
    <div className="space-y-3 sm:hidden">
      {products.map((product) => {
        const images = product.product_images ?? [];
        const imageUrl = publicMediaUrl((images.find((item) => item.is_main) ?? images[0])?.storage_path ?? null);
        return <article key={product.id} className="rounded-2xl border border-border bg-white p-3 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">{imageUrl ? <Image src={imageUrl} alt="" fill sizes="56px" unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted">بدون صورة</span>}</div>
            <div className="min-w-0 flex-1"><Link className="line-clamp-2 text-sm font-semibold text-primary hover:underline" href={`/admin/products/${product.id}`}>{product.name}</Link><span className="mt-1 block truncate text-[11px] text-muted">/{product.slug}</span></div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${product.is_active ? "bg-green-50 text-success" : "bg-slate-100 text-muted"}`}>{product.is_active ? "منشور" : "مسودة"}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs"><span className="text-muted">{categoryNames(product) || "بدون تصنيف"}</span><span dir="auto" className="font-semibold tabular-nums">{product.base_price_old_yer.toLocaleString("ar-YE-u-nu-latn")}{product.discount_percent ? <span className="ms-1 font-medium text-success">−{product.discount_percent}%</span> : null}</span></div>
          <div className="mt-3 border-t border-border pt-3"><ProductActions product={product} /></div>
        </article>;
      })}
    </div>
    <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm sm:block">
      <table className="w-full min-w-[1020px] text-right text-sm">
        <thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-4 font-medium">المنتج</th><th className="p-4 font-medium">التصنيفات</th><th className="p-4 font-medium">السعر الأساسي</th><th className="p-4 font-medium">الحالة</th><th className="p-4 font-medium">إجراءات</th></tr></thead>
        <tbody>{products.map((product) => {
          const images = product.product_images ?? [];
          const imageUrl = publicMediaUrl((images.find((item) => item.is_main) ?? images[0])?.storage_path ?? null);
          return <tr key={product.id} className="border-t border-border transition hover:bg-slate-50/70">
            <td className="p-4"><div className="flex items-center gap-3"><div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">{imageUrl ? <Image src={imageUrl} alt="" fill sizes="48px" unoptimized className="object-cover" /> : <span className="flex h-full items-center justify-center text-xs text-muted">—</span>}</div><div><Link className="font-medium text-primary hover:underline" href={`/admin/products/${product.id}`}>{product.name}</Link><span className="mt-1 block text-xs text-muted">/{product.slug}</span></div></div></td>
            <td className="p-4 text-muted">{categoryNames(product) || "بدون تصنيف"}</td>
            <td className="whitespace-nowrap p-4"><span dir="auto" className="font-medium tabular-nums">{product.base_price_old_yer.toLocaleString("ar-YE-u-nu-latn")}</span>{product.discount_percent ? <span className="ms-2 text-xs text-success">-{product.discount_percent}%</span> : null}</td>
            <td className="p-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${product.is_active ? "bg-green-50 text-success" : "bg-slate-100 text-muted"}`}>{product.is_active ? "منشور وفعال" : "مسودة / غير فعال"}</span>{product.is_featured ? <span className="ms-2 text-xs text-warning">مميز</span> : null}</td>
            <td className="whitespace-nowrap p-4"><ProductActions product={product} /></td>
          </tr>;
        })}</tbody>
      </table>
    </div>
  </>;
}

export function AdminProductList({ initialProducts, count, filters }: { initialProducts: Product[]; count: number; filters: Filters }) {
  const [products, setProducts] = useState(initialProducts);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const hasMore = products.length < count;

  function loadMore() {
    setError("");
    startTransition(async () => {
      const result = await loadMoreAdminProducts(filters, products.length);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setProducts((current) => [...current, ...(result.products as Product[])]);
    });
  }

  return <ProductDeleteProvider>
    <ProductRows products={products} />
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-error">{error}</p> : null}
    {hasMore ? <div className="flex flex-col items-center gap-2 py-2"><button type="button" onClick={loadMore} disabled={pending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-white px-6 text-sm font-semibold text-primary shadow-sm transition hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60">{pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />جارٍ تحميل المنتجات</> : "عرض المزيد"}</button><span className="text-xs text-muted">عرض {products.length} من {count} منتج</span></div> : null}
  </ProductDeleteProvider>;
}
