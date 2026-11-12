"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";

export function ProofPreview({ proofId, mimeType, children }: { proofId: string; mimeType?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const isPdf = mimeType === "application/pdf";
  const src = `/api/admin/proofs/${encodeURIComponent(proofId)}`;

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return <>
    <button type="button" onClick={() => { setImageFailed(false); setOpen(true); }} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 font-semibold text-primary hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      معاينة الإثبات
    </button>
    {open && typeof document !== "undefined" ? createPortal(<div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 p-2 sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="معاينة إثبات الدفع" className="flex h-[min(88dvh,50rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2 sm:px-4 sm:py-2.5">
          <h2 className="font-semibold">إثبات الدفع</h2>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-slate-50" autoFocus>إغلاق</button>
        </header>
        <div className="flex h-[min(34dvh,20rem)] shrink-0 items-center justify-center overflow-auto bg-slate-100 p-2 sm:h-[min(48dvh,30rem)] sm:p-4">
          {isPdf
            ? <iframe title="ملف إثبات الدفع" src={src} className="h-full min-h-0 w-full rounded-lg bg-white" />
            : imageFailed ? <p role="alert" className="max-w-md rounded-xl border border-amber-200 bg-white p-4 text-center text-sm leading-6 text-amber-900">تعذر تحميل صورة الإثبات. أغلق المعاينة وحاول فتحها مرة أخرى.</p> : <Image src={src} width={1800} height={2400} unoptimized alt="صورة إثبات الدفع" className="h-auto max-h-full w-auto max-w-full object-contain" onError={() => setImageFailed(true)} />}
        </div>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto border-t border-border bg-white p-2.5 sm:p-3">{children}</div> : null}
      </section>
    </div>, document.body) : null}
  </>;
}
