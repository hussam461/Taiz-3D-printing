"use client";

import { useRef, useState } from "react";

export function StoreSearchForm() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const canSearch = query.trim().length > 0;

  return (
    <form action="/products" role="search" autoComplete="off" dir="rtl" onSubmit={(event) => { if (!canSearch) { event.preventDefault(); inputRef.current?.focus(); } }} className="order-1 flex h-10 w-full basis-full items-center gap-1 rounded-full border border-border bg-slate-50 px-2 transition-colors focus-within:border-slate-400 focus-within:shadow-sm sm:h-11 xl:order-3 xl:h-10 xl:w-72 xl:basis-auto 2xl:w-80">
      <label htmlFor="store-header-search" className="sr-only">ابحث عن منتج</label>
      <input ref={inputRef} id="store-header-search" name="storefrontSearch" type="search" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ابحث عن منتج أو تصنيف..." className="store-search-field min-h-9 min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 text-sm text-text outline-none shadow-none placeholder:text-muted/80 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none" />
      {query.length > 0 ? (
        <button type="button" aria-label="مسح البحث" title="مسح البحث" onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary active:scale-95">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      ) : null}
      <button type="submit" aria-label="بحث" title="بحث" disabled={!canSearch} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 transition duration-150 hover:bg-primary hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-95 disabled:cursor-not-allowed disabled:opacity-50">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
      </button>
    </form>
  );
}
