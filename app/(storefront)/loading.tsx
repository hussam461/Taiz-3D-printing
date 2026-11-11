export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6" aria-label="جارٍ تحميل الصفحة" aria-busy="true">
      <div className="h-5 w-32 animate-pulse rounded-full bg-slate-200" />
      <section className="rounded-2xl border border-border bg-white p-5 shadow-sm sm:rounded-3xl sm:p-8">
        <div className="h-8 w-2/3 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-4 h-4 w-full max-w-xl animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-4/5 max-w-lg animate-pulse rounded bg-slate-100" />
      </section>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl border border-border bg-white p-3 shadow-sm"><div className="aspect-[5/4] animate-pulse rounded-xl bg-slate-100" /><div className="mt-4 h-4 w-2/3 animate-pulse rounded bg-slate-200" /><div className="mt-3 h-10 animate-pulse rounded-xl bg-slate-100" /></div>)}
      </div>
    </main>
  );
}
