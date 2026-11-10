import Link from "next/link";
import {
  getActiveCategories,
  getFeaturedProducts,
  getColors,
  getMaterials,
  getPublishedHomepageBenefits,
  getLatestProducts,
  getPublishedHomepageSlides,
  getStorefrontContext,
} from "@/lib/queries/storefront";
import { ProductsCarousel } from "@/components/storefront/latest-products-carousel";
import { HeroCarousel } from "@/components/storefront/hero-carousel";
import { CategoryCarousel } from "@/components/storefront/category-carousel";
import { publicMediaUrl } from "@/lib/storage/public-url";
import { HomepageBenefitCard } from "@/components/storefront/homepage-benefit-card";

export default async function HomePage() {
  const [{ store }, categories, featured, latest, slides, benefits, colors, materials] = await Promise.all([
    getStorefrontContext(),
    getActiveCategories(),
    getFeaturedProducts(),
    getLatestProducts(),
    getPublishedHomepageSlides(),
    getPublishedHomepageBenefits(),
    getColors(),
    getMaterials(),
  ]);
  const defaultColor = colors.find((color) => color.is_default) ?? colors[0] ?? null;
  const defaultMaterial = materials.find((material) => material.is_default) ?? materials[0] ?? null;

  const carouselSlides = slides.map((slide) => ({
    ...slide,
    image_url: publicMediaUrl(slide.image_path, "store-assets") ?? "",
  })).filter((slide) => slide.image_url);
  return (
    <div className="-mt-8 space-y-10 sm:space-y-16">
      <section className="relative w-screen pb-3 sm:pb-4" style={{ marginInlineStart: "calc(50% - 50vw)" }}>
        {carouselSlides.length ? <HeroCarousel slides={carouselSlides} /> : <div className="flex h-[clamp(12rem,52vw,25rem)] flex-col items-center justify-center bg-navy px-6 text-center text-white sm:h-[clamp(28rem,34.4vw,41.25rem)]">
          <p className="text-sm text-accent">{store.store_name}</p>
          <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">{store.hero_headline}</h1>
          <p className="mt-4 max-w-2xl text-white/80 sm:text-lg">{store.hero_description}</p>
        </div>}

        <CategoryCarousel categories={categories} />
      </section>

      {featured.length > 0 ? (
        <ProductsCarousel products={featured} defaultColor={defaultColor} defaultMaterial={defaultMaterial} heading="منتجات مميّزة" headingId="featured-products-heading" viewAllHref="/products?featured=1" />
      ) : null}

      {latest.length > 0 ? (
        <ProductsCarousel products={latest} defaultColor={defaultColor} defaultMaterial={defaultMaterial} heading="أحدث المنتجات" headingId="latest-products-heading" viewAllHref="/products?sort=newest" />
      ) : null}

      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-white p-6 shadow-sm sm:p-8 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">لديك فكرة مختلفة؟</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight">نحوّل تصميمك إلى قطعة مطبوعة</h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            أرسل فكرتك أو ملفك؛ نراجع إمكانية التنفيذ والتكلفة ومدة الإنتاج معك قبل بدء العمل.
          </p>
        </div>
        <Link href="/custom-order" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          ابدأ طلبًا مخصّصًا <span aria-hidden="true">←</span>
        </Link>
      </section>

      {benefits.length > 0 ? (
        <section aria-label="مزايا المتجر">
          <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
            {benefits.map((benefit, index) => (
              <HomepageBenefitCard key={benefit.id} title={benefit.title} description={benefit.description} className={index === 0 ? "col-span-2 md:col-span-1" : ""} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
