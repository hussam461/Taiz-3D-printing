"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="القائمة الرئيسية" className="order-2 hidden items-center gap-1.5 xl:flex xl:gap-2">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
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
