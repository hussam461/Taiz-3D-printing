"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const CART_ORIGIN_KEY = "storefront-cart-origin";
const labels: Record<string, string> = {
  "/products": "المنتجات",
  "/cart": "السلة",
  "/checkout": "إتمام الطلب",
  "/checkout/success": "تم استلام طلبك",
  "/custom-order": "طلب مخصّص",
  "/about": "من نحن",
  "/contact": "تواصل معنا",
  "/faq": "الأسئلة الشائعة",
  "/terms": "الشروط والأحكام",
  "/privacy": "سياسة الخصوصية",
  "/payment-policy": "سياسة الدفع",
  "/delivery-policy": "سياسة التوصيل",
  "/custom-orders-policy": "الطلبات المخصّصة",
  "/refund-policy": "سياسة الاسترجاع",
};

type Crumb = { label: string; href?: string };
type CartOrigin = { pathname: string; label: string };

export function rememberCartOrigin(pathname: string) {
  if (typeof window === "undefined") return;
  const productHeading = pathname.startsWith("/products/")
    ? document.querySelector("main h1")?.textContent?.trim()
    : null;
  const title = productHeading || document.title.split(" | ")[0]?.trim();
  const label = pathname.startsWith("/products/") ? title || "المنتج" : labels[pathname] ?? "الرئيسية";
  window.sessionStorage.setItem(CART_ORIGIN_KEY, JSON.stringify({ pathname, label } satisfies CartOrigin));
}

export function StoreBreadcrumbs() {
  const pathname = usePathname();
  const [cartOrigin, setCartOrigin] = useState<CartOrigin | null>(null);

  useEffect(() => {
    if (pathname !== "/cart") {
      setCartOrigin(null);
      return;
    }
    try {
      const stored = window.sessionStorage.getItem(CART_ORIGIN_KEY);
      setCartOrigin(stored ? JSON.parse(stored) as CartOrigin : null);
    } catch {
      setCartOrigin(null);
    }
  }, [pathname]);

  if (pathname === "/" || pathname.startsWith("/products/")) return null;

  let crumbs: Crumb[];
  if (pathname === "/cart") {
    crumbs = [{ label: "الرئيسية", href: "/" }];
    if (cartOrigin?.pathname.startsWith("/products/")) {
      crumbs.push({ label: "المنتجات", href: "/products" }, { label: cartOrigin.label });
    } else if (cartOrigin?.pathname === "/products") {
      crumbs.push({ label: "المنتجات", href: "/products" });
    } else if (cartOrigin && cartOrigin.pathname !== "/") {
      crumbs.push({ label: cartOrigin.label, href: cartOrigin.pathname });
    }
    crumbs.push({ label: "السلة" });
  } else {
    const label = labels[pathname];
    if (!label) return null;
    crumbs = [{ label: "الرئيسية", href: "/" }, { label }];
  }

  return (
    <nav aria-label="مسار الصفحة" className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted">
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-2">
          {index > 0 ? <span aria-hidden="true">›</span> : null}
          {crumb.href ? <Link href={crumb.href} className="transition hover:text-primary">{crumb.label}</Link> : <span aria-current="page" className="font-medium text-text">{crumb.label}</span>}
        </span>
      ))}
    </nav>
  );
}
