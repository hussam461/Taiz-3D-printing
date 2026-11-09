"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function ProofPreview({ proofId, mimeType }: { proofId: string; mimeType?: string }) {
  const [open, setOpen] = useState(false);
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
    <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 font-semibold text-primary hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
      معاينة الإثبات
    </button>
    {open ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-3 sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-label="معاينة إثبات الدفع" className="flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold">إثبات الدفع</h2>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-slate-50" autoFocus>إغلاق</button>
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-slate-100 p-2 sm:p-4">
          {isPdf
            ? <iframe title="ملف إثبات الدفع" src={src} className="h-[75dvh] w-full rounded-lg bg-white" />
            : <Image src={src} width={1600} height={1200} unoptimized alt="صورة إثبات الدفع" className="max-h-[78dvh] max-w-full object-contain" />}
        </div>
      </section>
    </div> : null}
  </>;
}
