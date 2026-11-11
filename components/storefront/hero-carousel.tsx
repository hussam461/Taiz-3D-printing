"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { HomepageSlide } from "@/lib/queries/storefront";
import { usePrefersReducedMotion } from "@/components/storefront/use-reduced-motion";

export function HeroCarousel({ slides }: { slides: Array<HomepageSlide & { image_url: string }> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [previousIndex, setPreviousIndex] = useState<number | null>(null);
  const [interacting, setInteracting] = useState(false);
  const activeIndexRef = useRef(0);
  const transitionTimeout = useRef<number | null>(null);
  const pointerStartX = useRef<number | null>(null);
  const suppressClick = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const multiple = slides.length > 1;

  const goTo = useCallback((index: number) => {
    if (!slides.length) return;
    const nextIndex = (index + slides.length) % slides.length;
    if (nextIndex === activeIndexRef.current) return;
    setPreviousIndex(activeIndexRef.current);
    activeIndexRef.current = nextIndex;
    setActiveIndex(nextIndex);
    if (transitionTimeout.current !== null) window.clearTimeout(transitionTimeout.current);
    transitionTimeout.current = window.setTimeout(() => {
      setPreviousIndex(null);
      transitionTimeout.current = null;
    }, 1100);
  }, [slides.length]);

  useEffect(() => {
    if (!multiple || prefersReducedMotion || interacting) return;
    const timer = window.setInterval(() => goTo(activeIndexRef.current + 1), 6000);
    return () => window.clearInterval(timer);
  }, [goTo, interacting, multiple, prefersReducedMotion]);

  useEffect(() => () => {
    if (transitionTimeout.current !== null) window.clearTimeout(transitionTimeout.current);
  }, []);

  if (!slides.length) return null;
  const slide = slides[activeIndex] ?? slides[0];
  const content = (
    <div key={slide.id} className={`hero-content-enter flex h-full w-full flex-col items-center justify-center px-12 py-2 text-center text-white sm:px-20 sm:py-10 ${prefersReducedMotion ? "[animation:none]" : ""}`}>
      {slide.title?.trim() ? <h1 className="max-w-4xl text-xl font-bold leading-tight drop-shadow-sm sm:text-4xl md:text-5xl">{slide.title}</h1> : null}
      {slide.description ? <p className={`mx-auto max-w-2xl text-sm leading-5 text-white/90 drop-shadow sm:text-lg sm:leading-7 ${slide.title?.trim() ? "mt-2 sm:mt-4" : ""}`}>{slide.description}</p> : null}
      {slide.href ? <span className="mt-3 inline-flex min-h-9 items-center rounded-lg bg-white px-4 py-2 text-xs font-semibold text-navy shadow-md transition-colors hover:bg-slate-100 sm:mt-7 sm:min-h-11 sm:px-5 sm:py-2.5 sm:text-sm">اكتشف المزيد</span> : null}
    </div>
  );

  return (
    <section
      aria-label="العروض والخدمات الرئيسية"
      aria-roledescription="معرض شرائح"
      aria-live="off"
      className="group relative isolate h-auto touch-pan-y select-none aspect-[2.56/1] overflow-hidden bg-navy sm:aspect-auto sm:h-[clamp(28rem,34.4vw,41.25rem)]"
      onPointerDown={(event) => { pointerStartX.current = event.clientX; suppressClick.current = false; }}
      onPointerUp={(event) => {
        if (pointerStartX.current === null) return;
        const distance = event.clientX - pointerStartX.current;
        pointerStartX.current = null;
        if (Math.abs(distance) < 45) return;
        suppressClick.current = true;
        goTo(activeIndexRef.current + (distance < 0 ? 1 : -1));
      }}
      onPointerCancel={() => { pointerStartX.current = null; }}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClick.current = false;
      }}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
    >
      <div className="absolute inset-0 bg-navy" aria-hidden="true">
        {slides.map((item, index) => {
          const isActive = index === activeIndex;
          const isPrevious = index === previousIndex;
          if (!isActive && !isPrevious) return null;
          return (
            <div key={item.id} className={`absolute inset-0 ${isActive ? `z-20 opacity-100 ${previousIndex !== null && !prefersReducedMotion ? "hero-slide-enter" : ""}` : "z-10 opacity-100"}`}>
              <Image src={item.image_url} alt="" fill sizes="100vw" unoptimized aria-hidden="true" className="scale-110 object-cover object-center opacity-60 blur-2xl" />
              <Image src={item.image_url} alt="" fill priority={isActive && activeIndex === 0} sizes="100vw" unoptimized className="z-10 object-contain object-center sm:object-cover" />
              <div className="absolute inset-0 z-20 bg-gradient-to-b from-navy/10 via-transparent to-navy/35" />
            </div>
          );
        })}
      </div>

      {slide.href ? (
        <Link href={slide.href} aria-label={slide.title?.trim() || "اكتشف المزيد"} className="absolute inset-0 z-20 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white">{content}</Link>
      ) : <div className="absolute inset-0 z-20">{content}</div>}

      {multiple ? <>
        <button type="button" onClick={() => goTo(activeIndex - 1)} aria-label="الشريحة السابقة" className="absolute start-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-navy shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:start-5 sm:inline-flex sm:h-12 sm:w-12">›</button>
        <button type="button" onClick={() => goTo(activeIndex + 1)} aria-label="الشريحة التالية" className="absolute end-3 top-1/2 z-30 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-navy shadow-lg transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:end-5 sm:inline-flex sm:h-12 sm:w-12">‹</button>
        <div className="absolute inset-x-0 bottom-3 z-30 flex items-center justify-center gap-1.5 sm:bottom-5 sm:gap-2" aria-label="اختيار البانر">
          {slides.map((item, index) => <button key={item.id} type="button" onClick={() => goTo(index)} aria-label={`البانر ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined} className={`h-1.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:h-2 ${index === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/60 hover:bg-white/90 sm:w-2"}`} />)}
        </div>
      </> : null}
    </section>
  );
}
