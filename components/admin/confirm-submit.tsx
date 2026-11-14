"use client";

import { useId, useState } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmit({ children, message, className, compact = false, confirmPrompt, confirmLabel = "تأكيد", pendingLabel = "جارٍ التنفيذ...", name, value, spinnerOnly = false }: { children: React.ReactNode; message: string; className?: string; compact?: boolean; confirmPrompt?: string; confirmLabel?: string; pendingLabel?: string; name?: string; value?: string; spinnerOnly?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const { pending } = useFormStatus();
  const titleId = useId();
  return <>
    <button type="button" onClick={() => setConfirming(true)} className={className}>{children}</button>
    {confirming ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setConfirming(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-border bg-white p-5 shadow-2xl sm:p-6">
        <h2 id={titleId} className="text-lg font-bold text-text">{confirmPrompt ?? (compact ? "تأكيد الحذف؟" : "تأكيد الإجراء")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{message}</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" disabled={pending} onClick={() => setConfirming(false)} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-text disabled:opacity-50">إلغاء</button>
          <button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} className="inline-flex min-h-10 min-w-24 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
            {pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /><span className="sr-only">{pendingLabel}</span></> : confirmLabel}
          </button>
        </div>
      </section>
    </div> : null}
  </>;
}

export function WarningDialogButton({ children, title, message, className }: { children: React.ReactNode; title: string; message: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return <>
    <button type="button" onClick={() => setOpen(true)} className={className}>{children}</button>
    {open ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby={titleId} className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-lg font-bold text-amber-700" aria-hidden="true">!</div>
        <h2 id={titleId} className="mt-3 text-lg font-bold text-text">{title}</h2>
        <div className="mt-2 text-sm leading-6 text-muted">{message}</div>
        <div className="mt-5 flex justify-end"><button type="button" autoFocus onClick={() => setOpen(false)} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white">حسنًا</button></div>
      </section>
    </div> : null}
  </>;
}
