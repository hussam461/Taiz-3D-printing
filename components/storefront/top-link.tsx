"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname } from "next/navigation";

type TopLinkProps = LinkProps & Omit<React.ComponentPropsWithoutRef<typeof Link>, keyof LinkProps>;

export function TopLink({ href, onClick, ...props }: TopLinkProps) {
  const pathname = usePathname();
  return <Link href={href} {...props} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    const target = typeof href === "string" ? new URL(href, window.location.href) : null;
    if (target?.pathname === pathname && target.search === window.location.search && target.hash === window.location.hash) {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }} />;
}
