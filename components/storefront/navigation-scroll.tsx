"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

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
      return;
    }
    historyPathname.current = null;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
