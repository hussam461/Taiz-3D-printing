"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LoadMorePaymentProofs({ href }: { href: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return <div className="flex justify-center border-t border-border pt-4">
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.push(href, { scroll: false }))}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-surface px-6 text-sm font-semibold text-text transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" /> جارٍ تحميل المزيد</> : "عرض المزيد"}
    </button>
  </div>;
}
