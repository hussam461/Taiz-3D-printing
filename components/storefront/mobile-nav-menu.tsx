"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type NavItem = { href: string; label: string };

export function MobileNavMenu({ items, storeName }: { items: NavItem[]; storeName: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
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
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border bg-white text-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {open ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        )}
      </button>
      {open ? createPortal(
        <>
          <button type="button" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} className="fixed inset-0 z-[100] cursor-default bg-navy/35 backdrop-blur-[2px]" />
          <div ref={drawerRef} id="store-mobile-navigation" role="dialog" aria-modal="true" aria-label={`قائمة ${storeName}`} onKeyDown={(event) => {
            if (event.key !== "Tab") return;
            const focusable = drawerRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
            if (!focusable?.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }} className="fixed inset-y-0 end-0 z-[101] flex w-[min(22rem,88vw)] flex-col border-s border-border bg-white shadow-2xl">
            <div className="flex min-h-20 items-center justify-between border-b border-border px-5">
              <div className="min-w-0"><p className="text-xs font-medium text-muted">تصفّح المتجر</p><p className="mt-1 truncate font-semibold text-navy">{storeName}</p></div>
              <button type="button" aria-label="إغلاق القائمة" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-slate-100 hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              </button>
            </div>
            <nav aria-label="القائمة الرئيسية" className="flex-1 overflow-y-auto p-3">
              {items.map((item, index) => {
                const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    ref={index === 0 ? firstLinkRef : undefined}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${active ? "bg-blue-50 text-primary" : "text-text hover:bg-slate-50"}`}
                  >
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <p className="border-t border-border px-5 py-4 text-xs leading-5 text-muted">تسوّق بسهولة، وسنساعدك في اختيار المنتج المناسب.</p>
          </div>
        </>,
        document.body,
      ) : null}
    </div>
  );
}
