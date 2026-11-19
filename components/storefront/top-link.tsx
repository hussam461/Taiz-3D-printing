"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type TopLinkProps = LinkProps & Omit<React.ComponentPropsWithoutRef<typeof Link>, keyof LinkProps>;

type StoreTopLinkProps = TopLinkProps & { scrollTopOnBack?: boolean };

export function TopLink({ href, onClick, scrollTopOnBack = false, ...props }: StoreTopLinkProps) {
  const pathname = usePathname();
  return <Link href={href} {...props} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const target = typeof href === "string" ? new URL(href, window.location.href) : null;
    if (target?.pathname === pathname && target.search === window.location.search && target.hash === window.location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (scrollTopOnBack) {
        try { sessionStorage.removeItem("taiz-footer-back-to-top"); } catch { /* Storage may be unavailable. */ }
        window.history.scrollRestoration = "auto";
      }
      return;
    }
    if (scrollTopOnBack) {
      try {
        sessionStorage.setItem("taiz-footer-back-to-top", "1");
        window.history.scrollRestoration = "manual";
      } catch { /* Keep normal browser restoration if storage is unavailable. */ }
    }
  }} />;
}
