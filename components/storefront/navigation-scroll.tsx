"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

const FOOTER_CONTENT_PATHS = new Set([
  "/faq",
  "/terms",
  "/privacy",
  "/payment-policy",
  "/delivery-policy",
  "/custom-orders-policy",
  "/refund-policy",
]);
const FOOTER_BACK_SCROLL_KEY = "taiz-footer-back-to-top";

export function NavigationScroll() {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const historyPathname = useRef<string | null>(null);

  useLayoutEffect(() => {
    const handleHistoryNavigation = (event: PopStateEvent) => {
      if (previousPathname.current === "/checkout/success") {
        let cameFromCompletedOrder = false;
        try {
          cameFromCompletedOrder = sessionStorage.getItem("taiz-printer-order-success") === "1";
          sessionStorage.removeItem("taiz-printer-order-success");
        } catch {
          cameFromCompletedOrder = false;
        }
        if (cameFromCompletedOrder) {
          event.stopImmediatePropagation();
          window.location.replace("/products");
          return;
        }
      }
      historyPathname.current = window.location.pathname;
    };
    window.addEventListener("popstate", handleHistoryNavigation, true);
    return () => window.removeEventListener("popstate", handleHistoryNavigation, true);
  }, []);

  useLayoutEffect(() => {
    if (previousPathname.current === pathname) return;
    const leftSuccessPage = previousPathname.current === "/checkout/success";
    previousPathname.current = pathname;

    if (leftSuccessPage) {
      try { sessionStorage.removeItem("taiz-printer-order-success"); } catch { /* Storage may be unavailable. */ }
    }

    if (historyPathname.current === pathname) {
      historyPathname.current = null;
      let returnToTop = false;
      try {
        returnToTop = sessionStorage.getItem(FOOTER_BACK_SCROLL_KEY) === "1";
        if (returnToTop) sessionStorage.removeItem(FOOTER_BACK_SCROLL_KEY);
      } catch { /* Storage may be unavailable. */ }
      if (returnToTop) {
        window.scrollTo({ top: 0, behavior: "instant" });
        window.setTimeout(() => { window.history.scrollRestoration = "auto"; }, 150);
      }
      return;
    }
    historyPathname.current = null;
    try {
      const footerBackModeActive = sessionStorage.getItem(FOOTER_BACK_SCROLL_KEY) === "1";
      if (!footerBackModeActive || !FOOTER_CONTENT_PATHS.has(pathname)) {
        sessionStorage.removeItem(FOOTER_BACK_SCROLL_KEY);
        window.history.scrollRestoration = "auto";
      }
    } catch { /* Storage may be unavailable. */ }
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
