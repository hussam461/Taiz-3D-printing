"use client";

import type { ProductCard } from "@/lib/queries/storefront";
import { useCart } from "@/components/storefront/cart-provider";

export function ProductCardActions({
  product,
  defaultColor,
  defaultMaterial,
}: {
  product: ProductCard;
  defaultColor: { id: string; name: string } | null;
  defaultMaterial: { id: string; name: string } | null;
}) {
  const { addItem } = useCart();
  function item() {
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.main_image,
      quantity: 1,
      colorId: defaultColor?.id ?? null,
      colorName: defaultColor?.name ?? "",
      materialId: defaultMaterial?.id ?? null,
      materialName: defaultMaterial?.name ?? "",
      basePriceOldYer: product.base_price_old_yer,
      discountPercent: product.discount_percent,
    };
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => {
          addItem(item());
        }}
        className="inline-flex min-h-11 w-full min-w-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-primary-hover active:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12 sm:gap-2 sm:px-4"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] shrink-0"><path d="M3.5 4.5h2l2.1 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.5L21 8H6.2M10 20a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm7 0a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM13.5 9.5v5m-2.5-2.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        أضف للسلة
      </button>
    </div>
  );
}
