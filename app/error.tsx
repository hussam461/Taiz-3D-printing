"use client";

import Link from "next/link";

export default function ErrorView({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-xl items-center justify-center p-6">
      <section className="w-full rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-xl text-error" aria-hidden="true">!</div>
        <h1 className="mt-5 text-xl font-semibold">تعذر تحميل الصفحة</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">حدثت مشكلة مؤقتة أثناء تحميل البيانات. أعد المحاولة، وإذا استمرت المشكلة تحقق من اتصال قاعدة البيانات أو تواصل مع مسؤول النظام.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover">إعادة المحاولة</button>
          <Link href="/admin" className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium">العودة للوحة الإدارة</Link>
        </div>
      </section>
    </main>
  );
}
