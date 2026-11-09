"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import type { CartItem } from "@/components/storefront/cart-provider";
import { discountedUnitPrice } from "@/lib/pricing";
import { formatOldYer } from "@/lib/formatting/money";
import { publicMediaUrl } from "@/lib/storage/public-url";
import { usePathname } from "next/navigation";
import { rememberCartOrigin } from "@/components/storefront/store-breadcrumbs";

export function CartAddedToast({ item, onDismiss }: { item: CartItem | null; onDismiss: () => void }) {
  const toastRef = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!item) return;
    const timeout = window.setTimeout(onDismiss, 5000);
    function dismissOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !toastRef.current?.contains(event.target)) onDismiss();
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onDismiss();
    }
    document.addEventListener("pointerdown", dismissOnOutsidePointer);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("pointerdown", dismissOnOutsidePointer);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [item, onDismiss]);

  if (!item) return null;

  const image = publicMediaUrl(item.image);
  const price = discountedUnitPrice({ basePriceOldYer: item.basePriceOldYer, discountPercent: item.discountPercent });

  return (
    <aside ref={toastRef} role="status" aria-live="polite" aria-label="تمت إضافة المنتج إلى السلة" className="fixed inset-x-3 top-20 z-[70] mx-auto w-auto max-w-md overflow-hidden rounded-2xl border border-border bg-white shadow-2xl sm:inset-x-auto sm:left-6 sm:right-auto sm:top-24 sm:w-[min(32rem,calc(100vw-3rem))]">
      <div className="h-1 w-full bg-slate-100"><div className="h-full w-full origin-right animate-[cart-toast-progress_5s_linear_forwards] bg-emerald-500" /></div>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-text">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700" aria-hidden="true">✓</span>
            تمت الإضافة إلى سلة التسوق
          </p>
          <button type="button" onClick={onDismiss} aria-label="إغلاق الإشعار" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-bg hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="flex gap-3 py-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-50 p-1.5">
            {image ? <Image src={image} alt="" fill sizes="80px" unoptimized className="object-contain p-1" /> : null}
          </div>
          <div className="flex min-w-0 flex-1 items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="line-clamp-2 font-semibold text-text">{item.name}</p>
              {item.colorName ? <p className="mt-1 text-muted">اللون: {item.colorName}</p> : null}
              {item.materialName ? <p className="text-muted">الخامة: {item.materialName}</p> : null}
              {item.quantity > 1 ? <p className="mt-1 text-xs text-muted">الكمية: {item.quantity}</p> : null}
            </div>
            <span className="shrink-0 font-semibold text-text">{formatOldYer(price.unitFinalPriceOldYer)}</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/cart" onClick={() => { rememberCartOrigin(pathname); onDismiss(); }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-3 text-sm font-semibold text-text transition hover:bg-bg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">عرض السلة</Link>
          <Link href="/checkout" onClick={onDismiss} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">إتمام الطلب</Link>
        </div>
      </div>
    </aside>
  );
}
