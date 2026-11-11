"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { FeedbackNotice } from "@/components/admin/feedback-notice";

type ActionResult = { ok: boolean; error?: string; id?: string } | null;
type Action = (formData: FormData) => Promise<ActionResult | void>;

export function ActionForm({ action, children, className, successMessage = "تم تنفيذ العملية بنجاح.", hideFeedback = false, feedbackPlacement = "inline", resetOnSuccess = false, onSuccess, onChange }: { action: Action; children: React.ReactNode; className?: string; successMessage?: string; hideFeedback?: boolean; feedbackPlacement?: "inline" | "toast"; resetOnSuccess?: boolean; onSuccess?: (result: Exclude<ActionResult, null>, submittedData: FormData) => void; onChange?: React.FormEventHandler<HTMLFormElement> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const valuesRef = useRef<Record<string, string | boolean>>({});
  const submittedDataRef = useRef<FormData>(new FormData());
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  const [offline, setOffline] = useState(false);
  const [visibleState, setVisibleState] = useState<ActionResult>(null);
  const [state, formAction, pending] = useActionState(async (_previous: ActionResult, formData: FormData) => {
    if (!navigator.onLine) return { ok: false, error: "لا يوجد اتصال بالإنترنت. أعد الاتصال ثم حاول مرة أخرى." };
    try { return (await action(formData)) ?? { ok: true }; } catch (error) {
      const digest = (error as { digest?: string } | null)?.digest;
      if (digest?.startsWith("NEXT_REDIRECT")) throw error;
      return { ok: false, error: "تعذر إكمال العملية بسبب مشكلة مؤقتة. أعد المحاولة، وإذا تكرر الخطأ فتواصل مع مسؤول النظام." };
    }
  }, null);
  useEffect(() => { const update = () => setOffline(!navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, []);
  useEffect(() => {
    if (!state) return;
    // The action result arrives asynchronously; mirror it locally so the notice can auto-dismiss.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVisibleState(state);
    if (state.ok) {
      onSuccessRef.current?.(state, submittedDataRef.current);
      formRef.current?.querySelectorAll<HTMLInputElement>('input[type="file"]').forEach((input) => { input.value = ""; });
      if (resetOnSuccess) formRef.current?.reset();
    }
    if (!state.ok && formRef.current) {
      for (const element of Array.from(formRef.current.elements)) {
        const field = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
        if (!field.name || field.type === "file" || !(field.name in valuesRef.current)) continue;
        if (field.type === "checkbox" || field.type === "radio") (field as HTMLInputElement).checked = Boolean(valuesRef.current[field.name]);
        else field.value = String(valuesRef.current[field.name]);
      }
      window.dispatchEvent(new Event("admin-form-error"));
      window.setTimeout(() => formRef.current?.querySelector<HTMLElement>(":invalid")?.focus(), 0);
    }
    const timer = window.setTimeout(() => setVisibleState(null), state.ok ? 3500 : 7000);
    return () => window.clearTimeout(timer);
  }, [state, resetOnSuccess]);
  return <form ref={formRef} action={formAction} onChange={onChange} onSubmit={() => { if (!formRef.current) return; submittedDataRef.current = new FormData(formRef.current); valuesRef.current = {}; for (const element of Array.from(formRef.current.elements)) { const field = element as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement; if (field.name && field.type !== "file") valuesRef.current[field.name] = field.type === "checkbox" || field.type === "radio" ? (field as HTMLInputElement).checked : field.value; } }} className={className}>{children}{hideFeedback ? null : <SubmitState pending={pending} offline={offline} state={visibleState} successMessage={successMessage} placement={feedbackPlacement} onDismiss={() => setVisibleState(null)} />}</form>;
}

function SubmitState({ pending, offline, state, successMessage, placement, onDismiss }: { pending: boolean; offline: boolean; state: ActionResult; successMessage: string; placement: "inline" | "toast"; onDismiss: () => void }) {
  const { pending: formPending } = useFormStatus();
  const isPending = pending || formPending;
  const toastClass = placement === "toast" ? "fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md shadow-xl sm:inset-x-auto sm:end-5 sm:bottom-5 sm:w-[min(26rem,calc(100vw-2.5rem))]" : "";
  return <div className={placement === "inline" ? "mt-4 space-y-3" : ""}>{offline && !isPending && !state ? <FeedbackNotice tone="warning" message="لا يوجد اتصال بالإنترنت حاليًا. أعد الاتصال قبل الحفظ." className={toastClass} onDismiss={placement === "toast" ? onDismiss : undefined} /> : null}{!isPending && state?.ok ? <FeedbackNotice tone="success" message={successMessage} className={toastClass} onDismiss={placement === "toast" ? onDismiss : undefined} /> : null}{!isPending && state && !state.ok ? <FeedbackNotice tone="error" message={state.error ?? "تعذر الحفظ. راجع البيانات وحاول مرة أخرى."} className={toastClass} onDismiss={placement === "toast" ? onDismiss : undefined} /> : null}</div>;
}

export function SubmitButton({ children, pendingLabel = "جارٍ التنفيذ...", className, ariaLabel, disabled = false, name, value, spinnerOnly = false }: { children: React.ReactNode; pendingLabel?: string; className?: string; ariaLabel?: string; disabled?: boolean; name?: string; value?: string; spinnerOnly?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" name={name} value={value} disabled={pending || disabled} aria-disabled={pending || disabled} aria-busy={pending} aria-label={pending && spinnerOnly ? pendingLabel : ariaLabel} className={`${className ?? ""} disabled:cursor-not-allowed disabled:opacity-60`}>{pending ? spinnerOnly ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" /><span className="sr-only">{pendingLabel}</span></> : <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" />{pendingLabel}</span> : children}</button>;
}
