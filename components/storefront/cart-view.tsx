"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/storefront/cart-provider";
import { calculateOrderTotals } from "@/lib/pricing";
import { formatIntegerWestern, formatOldYer } from "@/lib/formatting/money";
import { publicMediaUrl } from "@/lib/storage/public-url";
import { QuantityStepper } from "@/components/storefront/quantity-stepper";

type CartOption = { id: string; name: string; hex_code?: string | null };

export function CartView({ colors, materials, freeDeliveryEnabled, freeDeliveryMin }: { colors: CartOption[]; materials: CartOption[]; freeDeliveryEnabled: boolean; freeDeliveryMin: number }) {
  const { items, setQuantity, setVariant, removeItem, ready } = useCart();
  const totals = useMemo(
    () =>
      calculateOrderTotals({
        lines: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          basePriceOldYer: item.basePriceOldYer,
          discountPercent: item.discountPercent,
        })),
        delivery: { feeOldYer: 0, freeDeliveryEnabled, freeDeliveryMinOldYer: freeDeliveryMin },
      }),
    [items, freeDeliveryEnabled, freeDeliveryMin],
  );
  const remainingForFreeDelivery = Math.max(0, freeDeliveryMin - totals.finalTotalOldYer);

  if (!ready) return <p className="text-muted">جارٍ تحميل السلة…</p>;
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p>سلتك فارغة.</p>
        <Link href="/products" className="mt-4 inline-block text-primary">
          تصفّح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 pb-36 lg:grid-cols-[2fr_1fr] lg:pb-0">
      <ul className="space-y-4">
        {items.map((item) => {
          const image = publicMediaUrl(item.image);
          return (
            <li
              key={`${item.productId}-${item.colorId}-${item.materialId}`}
              className="relative grid min-w-0 grid-cols-2 gap-x-2 gap-y-2 rounded-xl border border-border bg-surface p-2 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_minmax(0,14rem)] sm:items-start sm:gap-x-4 sm:gap-y-3 sm:p-4"
            >
              <div className="col-span-2 row-start-1 flex min-w-0 items-start justify-start gap-2 border-b border-border pb-2 sm:col-span-1 sm:col-start-1 sm:gap-2.5 sm:border-0 sm:pb-0">
              <Link href={`/products/${item.slug}`} aria-label={`عرض تفاصيل ${item.name}`} className="h-fit w-16 shrink-0 overflow-hidden rounded-lg bg-slate-50 transition-opacity hover:opacity-90 sm:w-20">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt={item.name} className="block h-auto w-full object-contain" />
                ) : null}
              </Link>
              <div className="flex min-w-0 flex-col items-start gap-1 pt-1 text-right">
                <Link href={`/products/${item.slug}`} className="min-w-0 break-words text-right font-semibold">
                  {item.name}
                </Link>
                <span className="max-w-full break-words text-right text-sm text-muted">{formatOldYer(Math.round(item.basePriceOldYer * (1 - (item.discountPercent ?? 0) / 100)))}</span>
              </div>
              </div>
              <div className="col-span-2 row-start-3 min-w-0 border-t border-border pt-2 sm:col-span-3 sm:col-start-1 sm:row-start-3 sm:border-0 sm:pt-0">
                  {colors.length > 0 || materials.length > 0 ? <div className={`grid w-full min-w-0 max-w-sm gap-2 ${colors.length > 0 && materials.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {colors.length > 0 ? <fieldset className="grid min-w-0 max-w-full gap-2 text-xs text-muted"><legend className="text-right font-semibold text-text">اللون</legend><div className="storefront-color-options w-full min-w-0 max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 touch-pan-x"><div className="flex w-max min-w-full flex-nowrap items-center justify-start gap-3 whitespace-nowrap">
                    {[...colors].sort((a,b) => Number(isCurrentColor(b.name))-Number(isCurrentColor(a.name))).map((color) => <button key={color.id} type="button" aria-label={color.name} aria-pressed={item.colorId === color.id} title={color.name} onClick={() => setVariant(item.productId, item.colorId, item.materialId, color.id, color.name, item.materialId, item.materialName)} className={`shrink-0 ${isCurrentColor(color.name) ? `inline-flex min-h-7 translate-y-1 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${item.colorId === color.id ? "border-teal-600 bg-teal-50 text-teal-800" : "border-border text-muted hover:border-teal-500"}` : `flex min-w-11 flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 transition ${item.colorId === color.id ? "bg-teal-50 text-teal-700" : "hover:bg-slate-50"}`} `}>
                      {isCurrentColor(color.name) ? <><span className="h-3 w-3">{item.colorId === color.id ? "✓" : ""}</span><span>{color.name}</span></> : <><span className={`h-7 w-7 rounded-full border border-black/10 shadow-sm ${item.colorId === color.id ? "ring-2 ring-teal-600 ring-offset-2" : ""}`} style={{ backgroundColor: color.hex_code && /^#[0-9a-fA-F]{6}$/.test(color.hex_code) ? color.hex_code : fallbackColor(color.name) }} /><span>{color.name}</span></>}
                    </button>)}
                  </div></div></fieldset> : null}
                  {materials.length > 0 ? <label className="grid gap-1 text-xs text-muted">الخامة
                    <select aria-label={`خامة ${item.name}`} value={materials.some((material) => material.id === item.materialId) ? item.materialId ?? "" : ""} onChange={(event) => {
                      const option = materials.find((material) => material.id === event.target.value);
                      if (option) setVariant(item.productId, item.colorId, item.materialId, item.colorId, item.colorName, option.id, option.name);
                    }} className="min-h-10 rounded-lg border border-border bg-white px-2 text-sm text-text">
                      {materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
                    </select>
                  </label> : null}
                </div> : null}
              </div>
              <div className="absolute left-2 top-2 z-20 flex items-center gap-3">
                  <button
                    type="button"
                    aria-label={`إزالة ${item.name} من السلة`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-rose-400 text-xl leading-none text-white transition hover:bg-rose-500"
                    onClick={() => removeItem(item.productId, item.colorId, item.materialId)}
                  >
                    ×
                  </button>
              </div>
              <div className="col-start-1 row-start-2 flex min-w-0 items-center justify-self-start border-b border-border pb-2 sm:col-start-1 sm:row-start-2 sm:border-0 sm:pb-0">
                <QuantityStepper quantity={item.quantity} onChange={(value) => setQuantity(item.productId, item.colorId, item.materialId, value)} className="w-32 sm:w-36" />
              </div>
              <div className="col-start-2 row-start-2 flex min-w-0 max-w-full items-center justify-self-end border-b border-border pb-2 text-left sm:col-start-3 sm:row-start-2 sm:max-w-56 sm:items-start sm:border-0 sm:pb-0">
                <span className="flex max-w-full flex-wrap items-baseline gap-x-1 text-teal-700">
                  <span className="text-sm font-semibold leading-5 sm:text-base">المجموع: {formatIntegerWestern(Math.round(item.basePriceOldYer * (1 - (item.discountPercent ?? 0) / 100)) * item.quantity)}</span>
                  <span className="text-[11px] font-semibold leading-4 sm:text-xs">ر.ي قديم</span>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit rounded-xl border border-border bg-surface p-3 lg:p-5">
        {freeDeliveryEnabled ? <div className="mb-5 flex items-start gap-3 rounded-2xl border border-teal-100 bg-gradient-to-l from-teal-50 to-white p-4 text-right shadow-sm">
          <span aria-hidden="true" className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-sm"><TruckIcon /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-teal-900">{remainingForFreeDelivery === 0 ? "تهانينا، حصلت على شحن مجاني!" : "شحن مجاني"}</p>
            <p className="mt-1 text-sm leading-6 text-muted">{remainingForFreeDelivery === 0 ? "سيُطبق الشحن المجاني عند إتمام الطلب." : `أضف منتجات بقيمة ${formatOldYer(remainingForFreeDelivery)} لتحصل عليه.`}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-teal-100"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, freeDeliveryMin > 0 ? (totals.finalTotalOldYer / freeDeliveryMin) * 100 : 100)}%` }} /></div>
          </div>
        </div> : null}
        <div className="hidden lg:block">
          <h2 className="font-semibold">ملخص الطلب</h2>
          <div className="mt-3 flex items-center justify-between gap-3"><span className="text-muted">الإجمالي ({items.length} منتجات)</span><strong className="inline-flex items-baseline gap-1.5"><span className="text-lg font-bold tabular-nums">{formatIntegerWestern(totals.finalTotalOldYer)}</span><span className="text-sm font-medium text-muted">ر.ي قديم</span></strong></div>
          {!totals.freeDeliveryApplied ? <p className="mt-2 text-xs text-muted">تُحسب رسوم التوصيل حسب المنطقة عند إتمام الطلب.</p> : null}
          <Link href="/checkout" className="mt-4 block rounded-md bg-primary px-4 py-3 text-center text-white hover:bg-primary-hover">متابعة إلى إتمام الطلب</Link>
          <Link href="/products" className="mt-3 block text-center text-sm text-primary">متابعة التسوق</Link>
        </div>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-white/95 px-3 pt-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] shadow-[0_-8px_28px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted">ملخص الطلب · {items.length} منتجات</p>
            <p className="inline-flex items-baseline gap-1.5 text-text"><span className="text-base font-bold tabular-nums">{formatIntegerWestern(totals.finalTotalOldYer)}</span><span className="text-xs font-medium text-muted">ر.ي قديم</span></p>
          </div>
          <Link href="/checkout" className="flex min-h-12 w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-primary-hover">متابعة إلى إتمام الطلب</Link>
        </div>
      </div>
    </div>
  );
}

function fallbackColor(name: string) {
  const n = name.toLowerCase();
  const entries: [string, string][] = [["أسود", "#111111"], ["أبيض", "#ffffff"], ["أحمر", "#ef4444"], ["أزرق", "#3b82f6"], ["أخضر", "#22c55e"], ["ذهبي", "#f5b301"], ["زهري", "#e879f9"], ["تركوازي", "#14b8a6"]];
  return entries.find(([label]) => n.includes(label))?.[1] ?? "#94a3b8";
}

function isCurrentColor(name: string) {
  return name.trim().replace(/[أإآ]/g, "ا").replace(/\s+/g, " ") === "لون المنتج الحالي";
}

function TruckIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6"><path d="M3 6.5h11v10H3zM14 10h4l3 3v3.5h-7z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><circle cx="7" cy="18" r="1.8" fill="white" stroke="currentColor" strokeWidth="1.7" /><circle cx="18" cy="18" r="1.8" fill="white" stroke="currentColor" strokeWidth="1.7" /><path d="M5.5 9.5h6M5.5 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>;
}

export function SearchSuggestions() {
  const [q, setQ] = useState("");
  return (
    <input
      name="q"
      defaultValue={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="ابحث عن منتج أو وصف أو تصنيف"
      className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm"
    />
  );
}
