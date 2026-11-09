"use client";

import Link from "next/link";

type Props = {
  current: string;
  value: string;
  label: string;
  params: Record<string, string>;
};

export function OrderGroupTab({ current, value, label, params }: Props) {
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).filter(([, item]) => item)),
    group: value,
  });
  const active = current === value;

  return (
    <Link
      href={`/admin/orders?${query}`}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? "bg-primary text-white" : "bg-slate-100 text-text hover:bg-slate-200"}`}
    >
      <span>{label}</span>
    </Link>
  );
}
