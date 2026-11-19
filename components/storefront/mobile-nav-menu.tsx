"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Category } from "@/lib/queries/storefront";

type NavItem = { href: string; label: string };
const subscribeToNothing = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

function NavIcon({ href }: { href: string }) {
  const common = "h-5 w-5";
  if (href === "/") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="m3.5 10 8.5-7 8.5 7v10.5h-6v-6h-5v6h-6V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>;
  }
  if (href.startsWith("/products")) {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><rect x="4" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="4" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="4" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /><rect x="14" y="14" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.7" /></svg>;
  }
  if (href.startsWith("/custom-order")) {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><path d="M12 3.5v17M3.5 12h17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={common}><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M9.5 9a2.6 2.6 0 1 1 4.4 1.9c-1.2 1-1.9 1.4-1.9 3M12 17.3v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>;
}

export function MobileNavMenu({ items, storeName, categories }: { items: NavItem[]; storeName: string; categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const mounted = useSyncExternalStore(subscribeToNothing, getMountedSnapshot, getServerMountedSnapshot);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    function closeOnOutsidePointer(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target) && !drawerRef.current?.contains(event.target)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
      trigger?.focus();
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative xl:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
        aria-expanded={open}
        aria-controls="store-mobile-navigation"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center text-navy transition-colors hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {open ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        )}
      </button>
      {mounted ? createPortal(
        <>
          <button type="button" aria-label="إغلاق القائمة" aria-hidden={!open} tabIndex={open ? 0 : -1} disabled={!open} onClick={() => setOpen(false)} className={`fixed inset-0 z-[100] cursor-default bg-navy/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out motion-reduce:transition-none ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} />
          <div ref={drawerRef} id="store-mobile-navigation" role="dialog" aria-modal={open ? true : undefined} aria-hidden={!open} inert={!open} aria-label={`قائمة ${storeName}`} onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }} className={`fixed inset-y-0 right-0 z-[101] flex w-[min(22rem,90vw)] flex-col border-l border-border bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${open ? "translate-x-0" : "pointer-events-none translate-x-full"}`}>
            <div className="flex min-h-[5.5rem] items-center justify-between border-b border-border bg-gradient-to-l from-primary/[0.07] via-white to-white px-5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-sm">
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M3.5 10 12 3l8.5 7v10.5h-6v-6h-5v6h-6V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
                </span>
                <div className="min-w-0"><p className="text-[11px] font-semibold text-primary">تصفّح المتجر</p><p className="mt-1 truncate text-sm font-bold text-navy">{storeName}</p></div>
              </div>
              <button type="button" aria-label="إغلاق القائمة" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-white text-muted transition hover:border-primary/30 hover:bg-primary/5 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </button>
            </div>
            <nav aria-label="القائمة الرئيسية" className="flex-1 overflow-y-auto px-4 py-5">
              <p className="mb-3 px-2 text-[11px] font-semibold tracking-wide text-muted">التنقّل</p>
              <div className="space-y-1.5">
              {items.map((item, index) => {
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                if (item.href === "/products" && categories.length) {
                  return (
                    <div key={item.href}>
                      <button
                        type="button"
                        aria-expanded={productsExpanded}
                        aria-controls="store-mobile-product-categories"
                        onClick={() => setProductsExpanded((value) => !value)}
                        className={`group flex min-h-[3.35rem] w-full items-center justify-between rounded-2xl border px-3.5 text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? "border-primary/15 bg-primary/[0.08] font-bold text-primary shadow-sm" : "border-transparent font-medium text-text hover:border-border hover:bg-slate-50"}`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? "bg-white text-primary" : "bg-slate-50 text-muted group-hover:bg-white group-hover:text-primary"}`}><NavIcon href={item.href} /></span>
                          <span>{item.label}</span>
                        </span>
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`h-4 w-4 text-muted transition-transform ${productsExpanded ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </button>
                      {productsExpanded ? (
                        <div id="store-mobile-product-categories" className="ms-6 mt-1 space-y-1 border-s-2 border-primary/15 ps-3">
                          {categories.map((category) => (
                            <Link key={category.id} href={`/products?category=${encodeURIComponent(category.slug)}`} onClick={() => { setProductsExpanded(false); setOpen(false); }} className="flex min-h-10 items-center rounded-xl px-3 text-sm text-text transition hover:bg-slate-50 hover:text-primary">
                              {category.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`group flex min-h-[3.35rem] items-center justify-start rounded-2xl border px-3.5 text-sm transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? "border-primary/15 bg-primary/[0.08] font-bold text-primary shadow-sm" : "border-transparent font-medium text-text hover:border-border hover:bg-slate-50"}`}
                  >
                    <span className="flex items-center gap-3">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${active ? "bg-white text-primary" : "bg-slate-50 text-muted group-hover:bg-white group-hover:text-primary"}`}><NavIcon href={item.href} /></span>
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
              </div>
            </nav>
            <div className="border-t border-border bg-slate-50/80 px-5 py-4">
              <p className="text-xs font-semibold text-navy">تسوّق بسهولة</p>
              <p className="mt-1 text-xs leading-5 text-muted">تصفّح منتجاتنا واختر ما يناسبك.</p>
            </div>
          </div>
        </>,
        document.body,
      ) : null}
    </div>
  );
}
