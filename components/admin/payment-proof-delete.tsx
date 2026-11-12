"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/admin/action-form";
import { usePaymentProofSelection } from "@/components/admin/payment-proof-selection";
import { deletePaymentProof } from "@/lib/admin/actions";

type DeleteResult = { ok: boolean; error?: string } | null;

export function PaymentProofDelete({ proofId }: { proofId: string }) {
  const [confirming, setConfirming] = useState(false);
  const selection = usePaymentProofSelection();
  const router = useRouter();

  return <>
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex min-h-9 items-center rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
    >
      حذف الإثبات
    </button>
    {confirming ? <DeleteProofDialog
      proofId={proofId}
      onCancel={() => setConfirming(false)}
      onClose={() => {
        selection.removeDeletedIds([proofId]);
        setConfirming(false);
        router.refresh();
      }}
    /> : null}
  </>;
}

function DeleteProofDialog({ proofId, onCancel, onClose }: { proofId: string; onCancel: () => void; onClose: () => void }) {
  const [result, formAction] = useActionState(async (_previous: DeleteResult, _formData: FormData) => deletePaymentProof(proofId), null);
  const succeeded = result?.ok === true;

  return <form action={formAction} className="contents">
    <DismissibleDeleteBackdrop dismissEnabled={result !== null} onDismiss={succeeded ? onClose : onCancel}>
    <section role="alertdialog" aria-modal="true" aria-labelledby={`delete-proof-title-${proofId}`} className="max-h-[calc(100dvh-1.5rem)] w-[min(100%,26rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6">
      <h2 id={`delete-proof-title-${proofId}`} className="text-base font-bold text-text">{succeeded ? "اكتمل حذف الإثبات" : "تأكيد حذف الإثبات"}</h2>
      {succeeded ? <p role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-900">حُذف الإثبات وملفه من النظام بنجاح.</p> : <>
        <p className="mt-2 text-sm leading-6 text-muted">سيُحذف الإثبات وملفه نهائيًا، ولا يمكن التراجع عن ذلك.</p>
        {result && !result.ok ? <p role="alert" className="mt-3 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{result.error ?? "تعذر حذف الإثبات. حاول مرة أخرى."}</p> : null}
      </>}
      {succeeded ? <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">إغلاق</button></div> : <DeleteDialogActions onCancel={onCancel} />}
    </section>
    </DismissibleDeleteBackdrop>
  </form>;
}

function DismissibleDeleteBackdrop({ children, dismissEnabled, onDismiss }: { children: React.ReactNode; dismissEnabled: boolean; onDismiss: () => void }) {
  const { pending } = useFormStatus();
  return <div
    onClick={(event) => { if (event.target === event.currentTarget && dismissEnabled && !pending) onDismiss(); }}
    className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5"
  >{children}</div>;
}

function DeleteDialogActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return <div className="mt-5 flex flex-wrap justify-end gap-2">
    <button type="button" disabled={pending} onClick={onCancel} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-text hover:bg-slate-50 disabled:opacity-60">إلغاء</button>
    <SubmitButton spinnerOnly pendingLabel="جارٍ الحذف" className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700" ariaLabel="تأكيد حذف الإثبات">تأكيد الحذف</SubmitButton>
  </div>;
}
