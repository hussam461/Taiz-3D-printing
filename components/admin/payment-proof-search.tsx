"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function PaymentProofSearch({ status, initialQuery }: { status: string; initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const normalizedQuery = query.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 80);
  const searchHref = buildSearchHref(status, query);

  useEffect(() => {
    if (normalizedQuery === initialQuery) return;
    const timer = window.setTimeout(() => router.replace(searchHref, { scroll: false }), 350);
    return () => window.clearTimeout(timer);
  }, [normalizedQuery, initialQuery, router, searchHref]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!normalizedQuery) return;
    router.replace(searchHref, { scroll: false });
  }

  return <form onSubmit={handleSubmit} role="search" className="rounded-xl border border-border bg-surface p-3">
    <label htmlFor="payment-proof-search" className="mb-1.5 block text-xs font-medium text-muted">بحث برقم الطلب أو اسم العميل</label>
    <div className="flex w-full items-center gap-2">
      <input
        id="payment-proof-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="رقم الطلب أو اسم العميل"
        autoComplete="off"
        dir="auto"
        className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      />
      {query ? <button type="button" onClick={() => setQuery("")} aria-label="مسح البحث" className="inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-muted hover:bg-slate-50">×</button> : null}
      <button type="submit" disabled={!normalizedQuery} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50">بحث</button>
    </div>
  </form>;
}

function buildSearchHref(status: string, query: string) {
  const params = new URLSearchParams({ status });
  const normalized = query.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 80);
  if (normalized) params.set("q", normalized);
  return `/admin/payment-proofs?${params.toString()}`;
}
