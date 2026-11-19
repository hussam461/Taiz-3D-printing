"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/queries/storefront";

type NavItem = { href: string; label: string };

export function DesktopNav({ items, categories }: { items: NavItem[]; categories: Category[] }) {
  const pathname = usePathname();
  const [productsMenuOpen, setProductsMenuOpen] = useState(false);

  return (
    <nav aria-label="القائمة الرئيسية" className="order-2 hidden items-center gap-1.5 xl:flex xl:gap-2">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
        if (item.href === "/products") {
          return (
            <div key={item.href} className="group relative" onMouseEnter={() => setProductsMenuOpen(true)} onMouseLeave={() => setProductsMenuOpen(false)} onFocusCapture={() => setProductsMenuOpen(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setProductsMenuOpen(false); }}>
              <Link
                href={item.href}
                onClick={() => setProductsMenuOpen(false)}
                aria-current={active ? "page" : undefined}
                aria-haspopup={categories.length ? "true" : undefined}
                aria-expanded={categories.length ? productsMenuOpen : undefined}
                className={`relative inline-flex min-h-12 cursor-pointer items-center rounded-xl px-3 text-[15px] font-semibold tracking-tight transition-colors duration-150 hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:px-4 ${active ? "text-teal-600" : "text-slate-700"}`}
              >
                <span>{item.label}</span>
                {categories.length ? <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={`h-4 w-4 transition duration-150 ${productsMenuOpen ? "rotate-180 text-teal-600" : "text-current"}`}><path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}
              </Link>
              {categories.length ? (
                <div className={`absolute right-0 top-full z-50 min-w-52 rounded-xl border border-border bg-white py-2 shadow-xl transition duration-150 ${productsMenuOpen ? "visible translate-y-0 opacity-100" : "invisible translate-y-1 opacity-0"}`}>
                  {categories.map((category) => (
                    <Link key={category.id} href={`/products?category=${encodeURIComponent(category.slug)}`} onClick={() => setProductsMenuOpen(false)} className="block px-5 py-2.5 text-sm text-text transition hover:bg-slate-50 hover:text-primary focus-visible:bg-slate-50">
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
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative inline-flex min-h-12 cursor-pointer items-center rounded-xl px-3 text-[15px] font-semibold tracking-tight transition-colors duration-150 hover:text-teal-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary xl:px-4 ${active ? "text-teal-600" : "text-slate-700"}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
