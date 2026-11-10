"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductCard } from "@/lib/queries/storefront";
import { ProductCardView } from "@/components/storefront/product-card";
import { usePrefersReducedMotion } from "@/components/storefront/use-reduced-motion";

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
  const autoDirection = useRef(-1);
  const gestureTimeout = useRef<number | null>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [canScrollPrevious, setCanScrollPrevious] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [gesturePaused, setGesturePaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const paused = hovered || focused || gesturePaused;

  const getStep = (element: HTMLDivElement) => {
    const firstItem = element.firstElementChild as HTMLElement | null;
    if (!firstItem) return element.clientWidth * 0.8;
    const gap = Number.parseFloat(window.getComputedStyle(element).columnGap) || 0;
    return firstItem.getBoundingClientRect().width + gap;
  };

  const pauseForGesture = () => {
    setGesturePaused(true);
    if (gestureTimeout.current !== null) window.clearTimeout(gestureTimeout.current);
    gestureTimeout.current = window.setTimeout(() => {
      setGesturePaused(false);
      gestureTimeout.current = null;
    }, 6000);
  };

  const scroll = (direction: -1 | 1) => {
    const element = scrollRef.current;
    if (!element) return;
    pauseForGesture();
    const amount = getStep(element) * direction;
    if (prefersReducedMotion) element.scrollLeft += amount;
    else element.scrollBy({ left: amount, behavior: "smooth" });
  };

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateScrollState = () => {
      const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
      const progress = Math.min(maxScroll, Math.max(0, Math.abs(element.scrollLeft)));
      setHasOverflow(maxScroll > 2);
      setCanScrollNext(progress < maxScroll - 2);
      setCanScrollPrevious(progress > 2);
    };
    updateScrollState();
    element.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      element.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [products.length]);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting && entry.intersectionRatio >= 0.2);
    }, { threshold: [0, 0.2] });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element || !inView || !pageVisible || prefersReducedMotion || paused) return;
    const timer = window.setInterval(() => {
      const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
      if (maxScroll <= 2) return;
      const progress = Math.min(maxScroll, Math.max(0, Math.abs(element.scrollLeft)));
      if (progress >= maxScroll - 2) autoDirection.current = 1;
      else if (progress <= 2) autoDirection.current = -1;
      element.scrollBy({ left: autoDirection.current * getStep(element), behavior: "smooth" });
    }, 4500);
    return () => window.clearInterval(timer);
  }, [inView, pageVisible, paused, prefersReducedMotion, products.length]);

  useEffect(() => () => {
    if (gestureTimeout.current !== null) window.clearTimeout(gestureTimeout.current);
  }, []);

  return (
    <section
      aria-labelledby={headingId}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      onTouchStart={pauseForGesture}
      onWheel={pauseForGesture}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={headingId} className="text-xl font-semibold">{heading}</h2>
        <div dir="ltr" className="flex shrink-0 items-center gap-2 sm:gap-3">
          {hasOverflow ? (
            <>
              <button type="button" onClick={() => scroll(-1)} disabled={!canScrollNext} aria-label="المنتجات التالية" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                <ArrowIcon direction="previous" />
              </button>
              <button type="button" onClick={() => scroll(1)} disabled={!canScrollPrevious} aria-label="المنتجات السابقة" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white text-muted transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40">
                <ArrowIcon direction="next" />
              </button>
            </>
          ) : null}
          <Link href={viewAllHref} className="whitespace-nowrap px-1 text-sm font-semibold text-primary transition-colors hover:text-primary-hover sm:px-2 sm:text-base">عرض الكل</Link>
        </div>
      </div>
      <div ref={scrollRef} dir="rtl" aria-live="off" className="scrollbar-none flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:gap-4">
        {products.map((product) => (
          <div dir="rtl" key={product.id} className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-3rem)/4)]">
            <ProductCardView product={product} defaultColor={defaultColor} defaultMaterial={defaultMaterial} />
          </div>
        ))}
      </div>
    </section>
  );
}
