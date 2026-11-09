"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/storefront/cart-provider";
import { calculateOrderTotals } from "@/lib/pricing";
import { formatOldYer } from "@/lib/formatting/money";
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
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <ul className="space-y-4">
        {items.map((item) => {
          const image = publicMediaUrl(item.image);
          return (
            <li
              key={`${item.productId}-${item.colorId}-${item.materialId}`}
              className="relative grid grid-cols-2 gap-x-4 gap-y-5 rounded-xl border border-border bg-surface p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-start sm:p-6"
            >
              <div className="col-span-2 row-start-1 flex min-w-0 items-start justify-start gap-3 border-b border-border pb-5 sm:col-span-2 sm:col-start-1 sm:border-0 sm:pb-0">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-50 p-2 sm:h-24 sm:w-24">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" className="h-full w-full object-contain" />
                ) : null}
              </div>
              <div className="flex min-w-0 flex-col items-end gap-1 pt-1">
                <Link href={`/products/${item.slug}`} className="font-semibold">
                  {item.name}
                </Link>
                <span className="text-sm text-muted">{formatOldYer(Math.round(item.basePriceOldYer * (1 - (item.discountPercent ?? 0) / 100)))}</span>
              </div>
              </div>
              <div className="col-span-2 row-start-3 border-t border-border pt-5 sm:col-span-4 sm:row-start-2 sm:border-0 sm:pt-0">
                {colors.length > 0 || materials.length > 0 ? <div className={`grid max-w-sm gap-2 ${colors.length > 0 && materials.length > 0 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {colors.length > 0 ? <fieldset className="grid gap-2 text-xs text-muted"><legend className="text-right font-semibold text-text">اللون</legend><div className="flex flex-wrap items-center justify-start gap-3 sm:justify-center">
                    {[...colors].sort((a,b) => Number(isCurrentColor(b.name))-Number(isCurrentColor(a.name))).map((color) => <button key={color.id} type="button" aria-label={color.name} aria-pressed={item.colorId === color.id} title={color.name} onClick={() => setVariant(item.productId, item.colorId, item.materialId, color.id, color.name, item.materialId, item.materialName)} className={isCurrentColor(color.name) ? `inline-flex min-h-7 translate-y-1 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${item.colorId === color.id ? "border-teal-600 bg-teal-50 text-teal-800" : "border-border text-muted hover:border-teal-500"}` : `flex min-w-11 flex-col items-center gap-1 rounded-lg px-1.5 py-1.5 transition ${item.colorId === color.id ? "bg-teal-50 text-teal-700" : "hover:bg-slate-50"}`}>
                      {isCurrentColor(color.name) ? <><span className="h-3 w-3">{item.colorId === color.id ? "✓" : ""}</span><span>{color.name}</span></> : <><span className={`h-7 w-7 rounded-full border border-black/10 shadow-sm ${item.colorId === color.id ? "ring-2 ring-teal-600 ring-offset-2" : ""}`} style={{ backgroundColor: color.hex_code && /^#[0-9a-fA-F]{6}$/.test(color.hex_code) ? color.hex_code : fallbackColor(color.name) }} /><span>{color.name}</span></>}
                    </button>)}
                  </div></fieldset> : null}
                  {materials.length > 0 ? <label className="grid gap-1 text-xs text-muted">الخامة
                    <select aria-label={`خامة ${item.name}`} value={materials.some((material) => material.id === item.materialId) ? item.materialId ?? "" : ""} onChange={(event) => {
                      const option = materials.find((material) => material.id === event.target.value);
                      if (option) setVariant(item.productId, item.colorId, item.materialId, item.colorId, item.colorName, option.id, option.name);
                    }} className="min-h-10 rounded-lg border border-border bg-white px-2 text-sm text-text">
                      {!materials.some((material) => material.id === item.materialId) ? <option value="" disabled>اختر الخامة</option> : null}
                      {materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}
                    </select>
                  </label> : null}
                </div> : null}
              </div>
              <div className="absolute left-4 top-4 flex items-center gap-3 sm:static sm:col-start-4 sm:row-start-1 sm:pt-1">
                  <button
                    type="button"
                    aria-label={`إزالة ${item.name} من السلة`}
                    className="grid h-8 w-8 place-items-center rounded-full bg-rose-400 text-xl leading-none text-white transition hover:bg-rose-500"
                    onClick={() => removeItem(item.productId, item.colorId, item.materialId)}
                  >
                    ×
                  </button>
              </div>
              <div className="col-span-2 row-start-2 flex items-center justify-center gap-4 border-b border-border pb-5 sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:border-0 sm:pb-0">
                <QuantityStepper quantity={item.quantity} onChange={(value) => setQuantity(item.productId, item.colorId, item.materialId, value)} className="w-36" />
                <span className="whitespace-nowrap font-semibold text-teal-700">المجموع: {formatOldYer(Math.round(item.basePriceOldYer * (1 - (item.discountPercent ?? 0) / 100)) * item.quantity)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <aside className="h-fit rounded-xl border border-border bg-surface p-5">
        {freeDeliveryEnabled ? <div className="mb-5 rounded-xl bg-teal-50 p-4 text-right"><p className="font-semibold text-teal-800">{remainingForFreeDelivery === 0 ? "🎉 حصلت على شحن مجاني!" : "شحن مجاني"}</p><p className="mt-1 text-sm text-muted">{remainingForFreeDelivery === 0 ? "سيُطبق عند إتمام الطلب." : `أضف منتجات بقيمة ${formatOldYer(remainingForFreeDelivery)} لتحصل على شحن مجاني.`}</p><div className="mt-3 h-2 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${Math.min(100, freeDeliveryMin > 0 ? (totals.finalTotalOldYer / freeDeliveryMin) * 100 : 100)}%` }} /></div></div> : null}
        <h2 className="font-semibold">ملخص الطلب</h2>
        <div className="mt-3 flex items-center justify-between gap-3"><span className="text-muted">الإجمالي ({items.length} منتجات)</span><strong className="text-lg">{formatOldYer(totals.finalTotalOldYer)}</strong></div>
        {!totals.freeDeliveryApplied ? <p className="mt-2 text-xs text-muted">تُحسب رسوم التوصيل حسب المنطقة عند إتمام الطلب.</p> : null}
        <Link
          href="/checkout"
          className="mt-4 block rounded-md bg-primary px-4 py-3 text-center text-white hover:bg-primary-hover"
        >
          متابعة إلى إتمام الطلب
        </Link>
        <Link href="/products" className="mt-3 block text-center text-sm text-primary">
          متابعة التسوق
        </Link>
      </aside>
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

export function SearchSuggestions() {
  const [q, setQ] = useState("");
  return (
    <input
      name="q"
      defaultValue={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="ابحث عن منتج أو وصف أو تصنيف"
      className="w-full rounded-md border border-border px-3 py-2"
    />
  );
}
