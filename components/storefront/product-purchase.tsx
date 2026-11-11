"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/storefront/cart-provider";
import { QuantityStepper } from "@/components/storefront/quantity-stepper";
import { discountedUnitPrice } from "@/lib/pricing";
import { formatOldYer } from "@/lib/formatting/money";

type Option = { id: string; name: string; is_default: boolean; hex_code?: string | null };

export function ProductPurchase({
  productId,
  slug,
  name,
  image,
  basePriceOldYer,
  discountPercent,
  colors,
  materials,
}: {
  productId: string;
  slug: string;
  name: string;
  image: string | null;
  basePriceOldYer: number;
  discountPercent: number | null;
  colors: Option[];
  materials: Option[];
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [colorId, setColorId] = useState<string | null>(colors.find((c) => c.is_default)?.id ?? colors[0]?.id ?? null);
  const [materialId, setMaterialId] = useState(
    materials.find((m) => m.is_default)?.id ?? materials[0]?.id ?? null,
  );
  const optionsAvailable = (colors.length === 0 || Boolean(colorId)) && (materials.length === 0 || Boolean(materialId));
  const finalPriceOldYer = discountedUnitPrice({ basePriceOldYer, discountPercent }).unitFinalPriceOldYer;
  const orderedColors = [...colors].sort(
    (a, b) => Number(isCurrentProductColorOption(b.name)) - Number(isCurrentProductColorOption(a.name)),
  );

  function currentItem() {
    return {
      productId,
      slug,
      name,
      image,
      quantity,
      colorId,
          colorName: colors.find((c) => c.id === colorId)?.name ?? "",
      materialId,
      materialName: materials.find((m) => m.id === materialId)?.name ?? "",
      basePriceOldYer,
      discountPercent,
    };
  }

  function addSelectedItem() {
    if (!optionsAvailable) return;
    addItem(currentItem());
  }

  function buySelectedItem() {
    if (!optionsAvailable) return;
    sessionStorage.setItem("taiz-printer-direct-purchase", JSON.stringify(currentItem()));
    router.push("/checkout");
  }

  const optionClass = (selected: boolean) =>
    `inline-flex min-h-10 items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${selected ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border bg-white text-text hover:border-teal-600 hover:text-teal-700"}`;

  return (
    <>
      <div className="space-y-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <fieldset className="hidden space-y-3 rounded-xl bg-slate-50 p-3 lg:block">
          <legend className="sr-only">السعر والكمية</legend>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted">السعر</span>
            <span className="font-bold tabular-nums text-navy">{formatOldYer(finalPriceOldYer)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted">الكمية</span>
            <QuantityStepper quantity={quantity} onChange={setQuantity} className="w-36" />
          </div>
        </fieldset>
        {colors.length > 0 ? <fieldset className="space-y-2 rounded-xl border border-border bg-white p-3">
          <legend className="text-sm font-semibold text-text">اللون</legend>
          <div className="storefront-color-options max-w-full overflow-x-auto overflow-y-hidden overscroll-x-contain pb-2 touch-pan-x">
            <div className="flex w-max min-w-full flex-nowrap items-center justify-start gap-2 sm:gap-3">
            {orderedColors.map((color) => {
              const selected = colorId === color.id;
              const isCurrentProductColor = isCurrentProductColorOption(color.name);
              const swatch = color.hex_code && /^#[0-9a-fA-F]{6}$/.test(color.hex_code) ? color.hex_code : colorFromName(color.name);
              return <button key={color.id} type="button" aria-pressed={selected} onClick={() => setColorId(color.id)} className={`group flex shrink-0 items-center justify-center gap-1 text-[11px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isCurrentProductColor ? (selected ? "min-h-7 translate-y-1 rounded-full border border-teal-600 bg-teal-50 px-2 py-0.5 text-teal-800 shadow-sm" : "min-h-7 translate-y-1 rounded-full border border-border bg-slate-50 px-2 py-0.5 text-text hover:border-teal-500 hover:bg-teal-50/60") : "min-h-16 min-w-12 flex-col rounded-lg px-2 py-1 hover:bg-slate-50"}`}>
                {!isCurrentProductColor ? <span aria-hidden="true" className={`h-8 w-8 rounded-full border border-black/10 shadow-sm ${selected ? "ring-2 ring-primary ring-offset-2" : ""}`} style={{ backgroundColor: swatch }} /> : null}
                {isCurrentProductColor ? <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className={`h-3.5 w-3.5 shrink-0 ${selected ? "opacity-100" : "opacity-0"}`}><path d="m4.5 10.2 3.4 3.4 7.6-7.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
                <span className={selected ? "text-teal-800" : "text-muted"}>{color.name}</span>
              </button>;
            })}
            </div>
          </div>
        </fieldset> : null}
        {materials.length > 0 ? <fieldset className="space-y-2">
          <legend className="text-sm font-medium">الخامة</legend>
          <div className="flex flex-wrap gap-2">
            {materials.map((material) => <button key={material.id} type="button" aria-pressed={materialId === material.id} onClick={() => setMaterialId(material.id)} className={optionClass(materialId === material.id)}>{material.name}</button>)}
          </div>
        </fieldset> : null}
        <div className="hidden gap-2 lg:grid lg:grid-cols-2">
        <button
          type="button"
          disabled={!optionsAvailable}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover hover:shadow active:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={addSelectedItem}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6.2M10 20a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm7 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM13.5 9.5v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          أضف للسلة
        </button>
        <button
          type="button"
          disabled={!optionsAvailable}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-primary/35 bg-white px-4 py-3 font-semibold text-primary transition-colors duration-150 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          onClick={buySelectedItem}
        >
          اشتر الآن <span aria-hidden="true">←</span>
        </button>
      </div>
      {!optionsAvailable ? <p className="text-sm text-muted">اختر اللون والخامة لإضافة المنتج إلى السلة.</p> : null}
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto w-full max-w-xl space-y-2 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <QuantityStepper quantity={quantity} onChange={setQuantity} className="h-11 w-full" />
          <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={!optionsAvailable} onClick={addSelectedItem} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-hover active:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6.2M10 20a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm7 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM13.5 9.5v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            أضف للسلة
          </button>
          <button type="button" disabled={!optionsAvailable} onClick={buySelectedItem} className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-primary/35 bg-white px-2 text-sm font-semibold text-primary transition-colors hover:border-teal-600 hover:bg-teal-50 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50">اشتر الآن <span aria-hidden="true">←</span></button>
          </div>
        </div>
      </div>
    </>
  );
}

function colorFromName(name: string) {
  const value = name.trim().toLocaleLowerCase();
  const colors: [string, string][] = [
    ["أسود", "#111111"], ["black", "#111111"],
    ["أبيض", "#ffffff"], ["ابيض", "#ffffff"], ["white", "#ffffff"],
    ["ذهبي", "#f5b301"], ["gold", "#f5b301"],
    ["فضي", "#cbd5e1"], ["silver", "#cbd5e1"],
    ["تركوازي", "#14b8a6"], ["فيروزي", "#2dd4bf"], ["turquoise", "#14b8a6"],
    ["سماوي", "#22d3ee"], ["أزرق", "#3b82f6"], ["ازرق", "#3b82f6"], ["blue", "#3b82f6"],
    ["أخضر", "#22c55e"], ["اخضر", "#22c55e"], ["green", "#22c55e"],
    ["أحمر", "#ef4444"], ["احمر", "#ef4444"], ["red", "#ef4444"],
    ["أصفر", "#facc15"], ["اصفر", "#facc15"], ["yellow", "#facc15"],
    ["برتقالي", "#f97316"], ["orange", "#f97316"],
    ["زهري", "#e879f9"], ["وردي", "#ec4899"], ["pink", "#ec4899"],
    ["بنفسجي", "#a855f7"], ["purple", "#a855f7"],
    ["بني", "#92400e"], ["brown", "#92400e"],
    ["رمادي", "#9ca3af"], ["gray", "#9ca3af"], ["grey", "#9ca3af"],
    ["كحلي", "#1e3a8a"], ["navy", "#1e3a8a"],
  ];
  return colors.find(([label]) => value.includes(label))?.[1] ?? "#64748b";
}

function normalizeOptionName(name: string) {
  return name.trim().replace(/[أإآ]/g, "ا").replace(/\s+/g, " ");
}

function isCurrentProductColorOption(name: string) {
  return normalizeOptionName(name) === normalizeOptionName("لون المنتج الحالي");
}
