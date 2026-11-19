"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useCart } from "@/components/storefront/cart-provider";
import { calculateOrderTotals } from "@/lib/pricing";
import { formatIntegerWestern } from "@/lib/formatting/money";
import { usePathname } from "next/navigation";
import { rememberCartOrigin } from "@/components/storefront/store-breadcrumbs";

export function CartLink() {
  const pathname = usePathname();
  const { items, count, ready } = useCart();
  const total = useMemo(() => calculateOrderTotals({
    lines: items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      basePriceOldYer: item.basePriceOldYer,
      discountPercent: item.discountPercent,
    })),
    delivery: { feeOldYer: 0, freeDeliveryEnabled: false, freeDeliveryMinOldYer: 0 },
  }).finalTotalOldYer, [items]);
  const totalLabel = `${formatIntegerWestern(total)} ﷼`;

  return (
    <Link
      href="/cart"
      onClick={() => rememberCartOrigin(pathname)}
      aria-label={`السلة، ${ready ? count : 0} منتجات، الإجمالي ${totalLabel}`}
      title={`إجمالي السلة: ${totalLabel}`}
      className="group inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-0 rounded-full text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="relative inline-flex h-11 w-8 shrink-0 items-center justify-center">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6.2M10 20a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm7 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {ready && count > 0 ? (
          <span aria-hidden="true" className="absolute left-1/2 top-[15%] flex h-3 min-w-3 -translate-x-1/2 items-center justify-center rounded-full bg-red-700 px-0.5 text-[8px] font-bold leading-none text-white">
            {count}
          </span>
        ) : null}
      </span>
      <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums tracking-tight text-navy sm:text-xs">{totalLabel}</span>
    </Link>
  );
}
