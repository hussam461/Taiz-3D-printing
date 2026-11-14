"use client";

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Result = { ok: boolean; error?: string };
type DeleteAction = () => Promise<Result | void>;
type DeleteContextValue = { requestDelete: (action: DeleteAction) => void };
const DeleteContext = createContext<DeleteContextValue | null>(null);

export function ProductDeleteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [action, setAction] = useState<DeleteAction | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [pending, startTransition] = useTransition();
  const timer = useRef<number | null>(null);
  const open = action !== null;

  useEffect(() => {
    if (!open || !result?.ok) return;
    timer.current = window.setTimeout(() => {
      setAction(null);
      router.refresh();
    }, 3000);
    return () => { if (timer.current !== null) window.clearTimeout(timer.current); };
  }, [open, result, router]);

  function close() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    setAction(null);
    if (result?.ok) router.refresh();
  }

  function confirmDelete() {
    if (!action) return;
    startTransition(async () => {
      try {
        const response = await action();
        setResult(response ?? { ok: true });
      } catch {
        setResult({ ok: false, error: "تعذر حذف المنتج. حاول مرة أخرى." });
      }
    });
  }

  return <DeleteContext.Provider value={{ requestDelete: (deleteAction) => { setResult(null); setAction(() => deleteAction); } }}>
    {children}
    {open ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) close(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-delete-title" className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6">
        {result?.ok ? <>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-xl font-bold text-success" aria-hidden="true">✓</div>
          <h2 id="product-delete-title" className="mt-3 text-center text-lg font-bold">تم الحذف بنجاح</h2>
          <div className="mt-5 flex justify-center"><button type="button" onClick={close} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white">إغلاق</button></div>
        </> : <>
          <h2 id="product-delete-title" className="text-lg font-bold">تأكيد حذف المنتج</h2>
          <p className="mt-2 text-sm leading-6 text-muted">سيُحذف المنتج نهائيًا من قائمة المنتجات. ستبقى بيانات الطلبات السابقة محفوظة.</p>
          {result && !result.ok ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-error">{result.error ?? "تعذر حذف المنتج. حاول مرة أخرى."}</p> : null}
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" disabled={pending} onClick={close} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-text disabled:opacity-50">إلغاء</button>
            <button type="button" onClick={confirmDelete} disabled={pending} className="inline-flex min-h-10 min-w-24 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white disabled:opacity-60">{pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /><span className="sr-only">جارٍ الحذف</span></> : "تأكيد الحذف"}</button>
          </div>
        </>}
      </section>
    </div> : null}
  </DeleteContext.Provider>;
}

export function ProductDeleteButton({ action }: { action: DeleteAction }) {
  const context = useContext(DeleteContext);
  if (!context) throw new Error("ProductDeleteButton must be inside ProductDeleteProvider");
  return <button type="button" onClick={() => context.requestDelete(action)} className="rounded-lg px-2 py-1 text-xs font-medium text-error transition hover:bg-red-50">حذف</button>;
}
