import { StorefrontImage } from "@/components/storefront/storefront-image";
import { discountedUnitPrice } from "@/lib/pricing";
import { formatOldYer, toWesternDigits } from "@/lib/formatting/money";
import { publicMediaUrl } from "@/lib/storage/public-url";
import type { ProductCard } from "@/lib/queries/storefront";
import { ProductCardActions } from "@/components/storefront/product-card-actions";
import { TopLink } from "@/components/storefront/top-link";

export function ProductCardView({
  product,
  defaultColor,
  defaultMaterial,
}: {
  product: ProductCard;
  defaultColor: { id: string; name: string } | null;
  defaultMaterial: { id: string; name: string } | null;
}) {
  const priced = discountedUnitPrice({
    basePriceOldYer: product.base_price_old_yer,
    discountPercent: product.discount_percent,
  });
  const image = publicMediaUrl(product.main_image);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border/80 bg-surface shadow-sm">
      <TopLink href={`/products/${product.slug}`} aria-label={`عرض ${product.name}`} className="group relative block aspect-[5/4] overflow-hidden bg-slate-50 transition-transform duration-150 active:scale-[0.998] motion-reduce:transition-none">
        {image ? (
          <StorefrontImage
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 639px) 46vw, (max-width: 1023px) 31vw, (max-width: 1279px) 24vw, 300px"
            quality={75}
            className="object-contain transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">بدون صورة</div>
        )}
      </TopLink>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
        <h3 className="line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-text sm:min-h-12 sm:text-base sm:leading-6">
          <TopLink href={`/products/${product.slug}`} className="transition-colors duration-150 hover:text-teal-600 focus-visible:text-teal-600">
            {product.name}
          </TopLink>
        </h3>
        <div className="-mt-1 flex min-h-7 items-baseline gap-2">
          <span className={`text-xs font-semibold tabular-nums sm:text-sm ${product.discount_percent ? "text-red-600" : "text-text"}`}>{toWesternDigits(formatOldYer(priced.unitFinalPriceOldYer))}</span>
          {product.discount_percent ? (
            <span className="text-xs text-muted line-through sm:text-sm">
              {toWesternDigits(formatOldYer(priced.basePriceOldYer))}
            </span>
          ) : null}
        </div>
        <ProductCardActions product={product} defaultColor={defaultColor} defaultMaterial={defaultMaterial} />
      </div>
    </article>
  );
}
