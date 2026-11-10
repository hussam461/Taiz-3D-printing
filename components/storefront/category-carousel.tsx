"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/queries/storefront";

const tileClassName = "group flex w-[calc((100vw-3.5rem)/3)] shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border/80 bg-white text-center text-navy shadow-sm transition-[transform,box-shadow,color] duration-200 hover:scale-[1.015] hover:text-teal-600 hover:shadow-md motion-reduce:transition-none motion-reduce:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-[calc((100%-3rem)/4)] xl:w-[calc((100%-5rem)/6)]";

function CategoryIcon({ type }: { type: "products" | "custom" | "category" }) {
  if (type === "products") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-teal-600 sm:h-9 sm:w-9"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/><path d="m4.5 7.7 7.5 4.2 7.5-4.2M12 12v8.5" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>;
  }
  if (type === "custom") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-teal-600 sm:h-9 sm:w-9"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12m-8.48 8.48-2.12 2.12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8"/></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-teal-600 sm:h-9 sm:w-9"><path d="M4 5.5h16v13H4zM8 9h8m-8 4h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function ArrowIcon({ direction }: { direction: "previous" | "next" }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d={direction === "previous" ? "m14.5 5-7 7 7 7" : "m9.5 5 7 7-7 7"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function CategoryCarousel({ categories, allProductsImageUrl, customOrderImageUrl }: { categories: Category[]; allProductsImageUrl: string | null; customOrderImageUrl: string | null }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateScrollState = () => {
      const firstItem = element.firstElementChild?.getBoundingClientRect();
      const lastItem = element.lastElementChild?.getBoundingClientRect();
      const viewport = element.getBoundingClientRect();
      setCanScrollPrevious(Boolean(lastItem && lastItem.left < viewport.left - 2));
      setCanScrollNext(Boolean(firstItem && firstItem.right > viewport.right + 2));
    };
    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [categories.length]);

  const scroll = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative z-20 mx-auto -mt-6 w-full max-w-[76rem] px-3 sm:-mt-20 sm:px-6 lg:px-8">
      <button type="button" onClick={() => scroll(-320)} disabled={!canScrollPrevious} aria-label="التصنيفات السابقة" className={`absolute left-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition sm:left-2 ${canScrollPrevious ? "border border-border bg-white text-navy shadow-lg shadow-slate-900/15 hover:-translate-y-[calc(50%+2px)] hover:bg-slate-50" : "cursor-not-allowed border border-transparent bg-transparent text-slate-300 shadow-none"}`}>
        <ArrowIcon direction="previous" />
      </button>
      <div ref={scrollRef} dir="rtl" className="scrollbar-none flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 pb-1 sm:gap-4 sm:px-12">
        <Link dir="rtl" href="/products" className={tileClassName}>
          <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-50 sm:aspect-[5/4]">{allProductsImageUrl ? <Image src={allProductsImageUrl} alt="" fill sizes="(max-width: 639px) 34vw, 240px" className="object-cover object-center" /> : <span className="flex h-full items-center justify-center"><CategoryIcon type="products" /></span>}</span>
          <span className="flex min-h-9 items-center justify-center px-1 py-1.5 text-xs font-semibold sm:min-h-11 sm:text-sm">جميع المنتجات</span>
        </Link>
        <Link dir="rtl" href="/custom-order" className={tileClassName}>
          <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-50 sm:aspect-[5/4]">{customOrderImageUrl ? <Image src={customOrderImageUrl} alt="" fill sizes="(max-width: 639px) 34vw, 240px" className="object-cover object-center" /> : <span className="flex h-full items-center justify-center"><CategoryIcon type="custom" /></span>}</span>
          <span className="flex min-h-9 items-center justify-center px-1 py-1.5 text-xs font-semibold sm:min-h-11 sm:text-sm">طلب مخصّص</span>
        </Link>
        {categories.map((category) => <Link dir="rtl" key={category.id} href={`/products?category=${category.slug}`} className={tileClassName}>
          <span className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-50 sm:aspect-[5/4]">
            {category.image_url ? <Image src={category.image_url} alt="" fill sizes="(max-width: 639px) 34vw, 240px" className="object-cover object-center transition-transform duration-300 motion-reduce:transition-none group-hover:scale-[1.02]" /> : <span className="flex h-full items-center justify-center"><CategoryIcon type="category" /></span>}
          </span>
          <span className="line-clamp-2 flex min-h-8 items-center justify-center px-1 py-1 text-[11px] font-semibold leading-4 sm:min-h-11 sm:px-1.5 sm:py-1.5 sm:text-sm sm:leading-normal">{category.name}</span>
        </Link>)}
      </div>
      <button type="button" onClick={() => scroll(320)} disabled={!canScrollNext} aria-label="التصنيفات التالية" className={`absolute right-1 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full transition sm:right-2 ${canScrollNext ? "border border-border bg-white text-navy shadow-lg shadow-slate-900/15 hover:-translate-y-[calc(50%+2px)] hover:bg-slate-50" : "cursor-not-allowed border border-transparent bg-transparent text-slate-300 shadow-none"}`}>
        <ArrowIcon direction="next" />
      </button>
    </div>
  );
}
