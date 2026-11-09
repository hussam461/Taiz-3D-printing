"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { HomepageSlide } from "@/lib/queries/storefront";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeToMotionPreference(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}
function getReducedMotionPreference() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
function getServerMotionPreference() {
  return true;
}

export function HeroCarousel({ slides }: { slides: Array<HomepageSlide & { image_url: string }> }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [interacting, setInteracting] = useState(false);
  const prefersReducedMotion = useSyncExternalStore(subscribeToMotionPreference, getReducedMotionPreference, getServerMotionPreference);
  const multiple = slides.length > 1;
  const lastIndex = slides.length - 1;
  const canGoPrevious = activeIndex > 0;
  const canGoNext = activeIndex < lastIndex;

  useEffect(() => {
    if (!multiple || prefersReducedMotion || interacting || !canGoNext) return;
    const timer = window.setInterval(() => setActiveIndex((index) => Math.min(index + 1, lastIndex)), 5500);
    return () => window.clearInterval(timer);
  }, [canGoNext, interacting, lastIndex, multiple, prefersReducedMotion]);

  if (!slides.length) return null;
  const slide = slides[activeIndex] ?? slides[0];
  const previous = () => setActiveIndex((index) => Math.max(0, index - 1));
  const next = () => setActiveIndex((index) => Math.min(lastIndex, index + 1));
  const content = (
    <div className="flex h-full w-full flex-col items-center justify-center px-14 py-10 text-center text-white sm:px-20">
      {slide.title?.trim() ? <h1 className="max-w-4xl text-3xl font-bold leading-tight drop-shadow-sm sm:text-4xl md:text-5xl">{slide.title}</h1> : null}
      {slide.description ? <p className={`mx-auto max-w-2xl text-base leading-7 text-white/90 drop-shadow sm:text-lg ${slide.title?.trim() ? "mt-4" : ""}`}>{slide.description}</p> : null}
      {slide.href ? <span className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-navy shadow-md transition-colors hover:bg-slate-100">اكتشف المزيد</span> : null}
    </div>
  );

  return (
    <section
      aria-label="العروض والخدمات الرئيسية"
      aria-roledescription="معرض شرائح"
      className="group relative isolate h-[clamp(12rem,52vw,25rem)] overflow-hidden bg-navy sm:h-[clamp(28rem,34.4vw,41.25rem)]"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false); }}
    >
      <div className="absolute inset-0 -z-10 bg-navy">
        <Image src={slide.image_url} alt="" aria-hidden="true" fill priority sizes="100vw" unoptimized className="scale-110 object-cover object-center opacity-55 blur-2xl" />
        <div className="absolute inset-0 bg-navy/50" />
        <Image src={slide.image_url} alt="" aria-hidden="true" fill priority sizes="100vw" unoptimized className="object-contain object-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/25 via-transparent to-navy/45" />
      </div>
      {slide.href ? <Link href={slide.href} className="absolute inset-0 z-10 block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white">{content}</Link> : <div className="absolute inset-0 z-10">{content}</div>}

      {multiple ? <>
        <button type="button" onClick={previous} disabled={!canGoPrevious} aria-label="الشريحة السابقة" className="absolute start-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-navy shadow-lg transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none sm:start-5 sm:h-12 sm:w-12">›</button>
        <button type="button" onClick={next} disabled={!canGoNext} aria-label="الشريحة التالية" className="absolute end-3 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-navy shadow-lg transition hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-300 disabled:shadow-none sm:end-5 sm:h-12 sm:w-12">‹</button>
      </> : null}
    </section>
  );
}
