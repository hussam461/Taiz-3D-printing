"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductCard } from "@/lib/queries/storefront";
import { ProductCardView } from "@/components/storefront/product-card";

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5">
      <path d={direction === "previous" ? "m14.5 5-7 7 7 7" : "m9.5 5 7 7-7 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ProductsCarousel({
  products,
  defaultColor,
  defaultMaterial,
  heading,
  headingId,
  viewAllHref,
}: {
  products: ProductCard[];
  defaultColor: { id: string; name: string } | null;
  defaultMaterial: { id: string; name: string } | null;
  heading: string;
  headingId: string;
  viewAllHref: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateScrollState = () => {
      const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
      // In RTL, scrollLeft starts at 0 on the right and becomes negative as you move left.
      setHasOverflow(maxScroll > 2);
      setCanScrollPrevious(element.scrollLeft > -maxScroll + 2);
      setCanScrollNext(element.scrollLeft < -2);
    };
    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [products.length]);

  const scroll = (amount: number) => scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });

  return (
    <section aria-labelledby={headingId}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold">{heading}</h2>
        <div dir="ltr" className="flex shrink-0 items-center gap-2 sm:gap-3">
          {hasOverflow ? (
            <>
              <button type="button" onClick={() => scroll(-320)} disabled={!canScrollPrevious} aria-label="المنتجات السابقة" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                <ArrowIcon direction="previous" />
              </button>
              <button type="button" onClick={() => scroll(320)} disabled={!canScrollNext} aria-label="المنتجات التالية" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                <ArrowIcon direction="next" />
              </button>
            </>
          ) : null}
          <Link href={viewAllHref} className="whitespace-nowrap px-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover sm:px-2 sm:text-base">عرض الكل</Link>
        </div>
      </div>
      <div ref={scrollRef} dir="rtl" className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:gap-4">
        {products.map((product) => (
          <div dir="rtl" key={product.id} className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)]">
            <ProductCardView product={product} defaultColor={defaultColor} defaultMaterial={defaultMaterial} />
          </div>
        ))}
      </div>
    </section>
  );
}
