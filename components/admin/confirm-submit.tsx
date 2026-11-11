"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmSubmit({ children, message, className, compact = false, confirmPrompt, confirmLabel = "تأكيد", pendingLabel = "جارٍ التنفيذ...", name, value, spinnerOnly = false }: { children: React.ReactNode; message: string; className?: string; compact?: boolean; confirmPrompt?: string; confirmLabel?: string; pendingLabel?: string; name?: string; value?: string; spinnerOnly?: boolean }) {
  const [confirming, setConfirming] = useState(false);
  const { pending } = useFormStatus();
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className={className}>{children}</button>;
  const prompt = confirmPrompt ?? (compact ? "تأكيد الحذف؟" : message);
  if (compact) return <span role="group" aria-label={prompt} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-2 py-1"><span aria-hidden="true" className="text-[11px] font-medium text-red-900">{prompt}</span><button type="submit" name={name} value={value} disabled={pending} aria-busy={pending} aria-label={pending ? pendingLabel : confirmLabel} className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-md bg-error px-2.5 text-xs font-semibold text-white disabled:opacity-60">{pending ? spinnerOnly ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /><span className="sr-only">{pendingLabel}</span></> : pendingLabel : confirmLabel}</button><button type="button" disabled={pending} onClick={() => setConfirming(false)} className="min-h-8 rounded-md bg-white px-2 text-xs font-semibold text-text disabled:opacity-60">إلغاء</button></span>;
  return <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-error shadow-sm"><span className="max-w-64 leading-5">{message}</span><button type="submit" name={name} value={value} disabled={pending} className="rounded-lg bg-error px-2 py-1 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">{pending ? pendingLabel : confirmLabel}</button><button type="button" disabled={pending} onClick={() => setConfirming(false)} className="rounded-lg bg-white px-2 py-1 font-semibold text-text transition hover:bg-slate-100 disabled:opacity-60">إلغاء</button></span>;
}
