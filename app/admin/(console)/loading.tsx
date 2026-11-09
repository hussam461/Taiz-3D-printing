export default function AdminConsoleLoading() {
  return <div className="mx-auto max-w-7xl space-y-6" aria-busy="true" aria-live="polite">
    <div className="flex items-end justify-between border-b border-border pb-6"><div className="space-y-3"><div className="h-4 w-24 animate-pulse rounded bg-slate-200" /><div className="h-9 w-56 animate-pulse rounded bg-slate-200" /><div className="h-4 w-80 max-w-full animate-pulse rounded bg-slate-100" /></div><div className="h-11 w-32 animate-pulse rounded-lg bg-slate-200" /></div>
    <div className="rounded-2xl border border-border bg-surface p-6"><div className="h-5 w-40 animate-pulse rounded bg-slate-200" /><div className="mt-5 grid gap-4 md:grid-cols-3"><div className="h-12 animate-pulse rounded-lg bg-slate-100" /><div className="h-12 animate-pulse rounded-lg bg-slate-100" /><div className="h-12 animate-pulse rounded-lg bg-slate-100" /></div></div>
    <div className="grid gap-4 md:grid-cols-3"><div className="h-32 animate-pulse rounded-2xl bg-slate-100" /><div className="h-32 animate-pulse rounded-2xl bg-slate-100" /><div className="h-32 animate-pulse rounded-2xl bg-slate-100" /></div>
  </div>;
}
