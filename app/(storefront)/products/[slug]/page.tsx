import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getColors, getMaterials, getProductBySlug, getRelatedProducts, getFeaturedProducts } from "@/lib/queries/storefront";
import { ProductPurchase } from "@/components/storefront/product-purchase";
import { ProductsCarousel } from "@/components/storefront/latest-products-carousel";
import { discountedUnitPrice } from "@/lib/pricing";
import { formatOldYer } from "@/lib/formatting/money";
import { publicMediaUrl } from "@/lib/storage/public-url";
import type { Specification } from "@/types/domain";
import Image from "next/image";
import { productDescriptionToText, sanitizeProductDescriptionMarkup } from "@/lib/validation/product";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "المنتج غير موجود" };
  const images = (product.product_images ?? []) as { storage_path: string; is_main: boolean }[];
  const mainImage = images.find((item) => item.is_main) ?? images[0];
  const imageUrl = mainImage ? publicMediaUrl(mainImage.storage_path) : null;
  const title = product.seo_title?.trim() || product.name;
  const description = product.seo_description?.trim() || productDescriptionToText(product.description ?? "") || `تعرّف على ${product.name} من Taiz 3D Printing.`;
  return {
    title,
    description: description.slice(0, 160),
    openGraph: {
      title,
      description: description.slice(0, 160),
      type: "website",
      ...(imageUrl ? { images: [{ url: imageUrl, alt: product.name }] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [product, colors, materials, featured] = await Promise.all([
    getProductBySlug(slug),
    getColors(),
    getMaterials(),
    getFeaturedProducts(),
  ]);
  if (!product) notFound();
  const [related] = await Promise.all([
    product.categories?.slug ? getRelatedProducts(product.categories.slug, product.id) : Promise.resolve([]),
  ]);

  const priced = discountedUnitPrice({
    basePriceOldYer: Number(product.base_price_old_yer),
    discountPercent: product.discount_percent == null ? null : Number(product.discount_percent),
  });
  const images = (product.product_images ?? []) as {
    storage_path: string;
    alt_text: string | null;
    is_main: boolean;
    sort_order: number;
  }[];
  const image = images.find((item) => item.is_main) ?? images[0] ?? null;
  const specs = (product.specifications ?? []) as Specification[];
  return (
    <div className="min-w-0 max-w-full space-y-5 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-0">
      <nav aria-label="مسار الصفحة" className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <Link href="/" className="transition hover:text-primary">الرئيسية</Link>
        <span aria-hidden="true">›</span>
        <Link href="/products" className="transition hover:text-primary">المنتجات</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page" className="font-medium text-text">{product.name}</span>
      </nav>
      <div className="grid min-w-0 gap-8 lg:grid-cols-[1.3fr_1fr]">
      <div className="min-w-0">
        <div className="relative aspect-[5/4] overflow-hidden rounded-2xl border border-border bg-white">
          {image ? (() => { const src = publicMediaUrl(image.storage_path); return src ? <Image src={src} alt={image.alt_text ?? product.name} fill sizes="(max-width: 1024px) 100vw, 55vw" unoptimized className="object-contain" /> : null; })() : null}
        </div>
      </div>
      <div className="min-w-0 space-y-4">
        <h1 className="text-3xl font-semibold">{product.name}</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-navy">{formatOldYer(priced.unitFinalPriceOldYer)}</span>
          {product.discount_percent ? (
            <span className="text-muted line-through">{formatOldYer(priced.basePriceOldYer)}</span>
          ) : null}
        </div>
        {product.description ? <section aria-labelledby="product-description-heading" className="space-y-2 border-t border-border pt-4">
          <h2 id="product-description-heading" className="text-base font-semibold">وصف المنتج</h2>
          <div className="whitespace-pre-wrap leading-7 text-muted [&_p]:my-2 [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:list-decimal [&_ol]:ps-6" dangerouslySetInnerHTML={{ __html: sanitizeProductDescriptionMarkup(product.description) }} />
        </section> : null}
        {specs.length > 0 ? (
          <section aria-labelledby="product-specifications-heading" className="space-y-2 border-t border-border pt-4">
            <h2 id="product-specifications-heading" className="text-base font-semibold">المواصفات</h2>
            <dl className="grid gap-2 text-sm">
              {specs.map((spec) => (
                <div key={spec.label} className="flex justify-between gap-4 border-b border-border py-2 last:border-b-0">
                  <dt className="text-muted">{spec.label}</dt>
                  <dd className="text-end">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        <ProductPurchase
          productId={product.id}
          slug={product.slug}
          name={product.name}
          image={image?.storage_path ?? null}
          basePriceOldYer={Number(product.base_price_old_yer)}
          discountPercent={product.discount_percent == null ? null : Number(product.discount_percent)}
          colors={colors}
          materials={materials}
        />
      </div>
      </div>
      {related.length ? <ProductsCarousel products={related} defaultColor={colors.find((color) => color.is_default) ?? colors[0] ?? null} defaultMaterial={materials.find((material) => material.is_default) ?? materials[0] ?? null} heading="منتجات مشابهة" headingId="related-products-heading" viewAllHref={`/products?category=${encodeURIComponent(product.categories?.slug ?? "")}`} /> : null}
      {featured.filter((item) => item.id !== product.id).length ? <ProductsCarousel products={featured.filter((item) => item.id !== product.id)} defaultColor={colors.find((color) => color.is_default) ?? colors[0] ?? null} defaultMaterial={materials.find((material) => material.is_default) ?? materials[0] ?? null} heading="منتجات قد تعجبك" headingId="recommended-products-heading" viewAllHref="/products?featured=1" /> : null}
    </div>
  );
}
