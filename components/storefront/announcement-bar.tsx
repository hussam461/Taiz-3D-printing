"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AnnouncementBar({ enabled, text, buttonLabel, href, scope, buttonEnabled }: { enabled: boolean; text: string; buttonLabel: string; href: string; scope: "all" | "home"; buttonEnabled: boolean }) {
  const pathname = usePathname();
  if (!enabled || !text || (scope === "home" && pathname !== "/")) return null;

  return <div className="flex min-h-8 items-center justify-center gap-2 bg-[#123c4b] px-3 py-1 text-[11px] font-semibold text-white sm:gap-3 sm:text-xs">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0 text-accent"><path d="M4 10h16v10H4V10Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="M3 7h18v3H3V7ZM12 7v13M12 7H8.5a2.25 2.25 0 1 1 2.25-2.25C10.75 6 12 7 12 7Zm0 0h3.5a2.25 2.25 0 1 0-2.25-2.25C13.25 6 12 7 12 7Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
    <span className="min-w-0 truncate">{text}</span>
    {buttonEnabled && href && buttonLabel ? <Link href={href} className="inline-flex shrink-0 rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-bold text-navy transition hover:bg-white">{buttonLabel}</Link> : null}
  </div>;
}
