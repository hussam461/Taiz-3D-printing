"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteTerminalOrder } from "@/lib/admin/actions";

type DeleteResult = { ok: boolean; error?: string } | null;

export function OrderDeleteButton({ orderId, orderReference }: { orderId: string; orderReference: string }) {
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();

  return <>
    <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-9 items-center rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 transition hover:bg-red-50">حذف</button>
    {confirming ? <DeleteOrderDialog
      orderId={orderId}
      orderReference={orderReference}
      onCancel={() => setConfirming(false)}
      onClose={() => { setConfirming(false); router.refresh(); }}
    /> : null}
  </>;
}

function DeleteOrderDialog({ orderId, orderReference, onCancel, onClose }: { orderId: string; orderReference: string; onCancel: () => void; onClose: () => void }) {
  const [result, setResult] = useState<DeleteResult>(null);
  const [pending, setPending] = useState(false);
  const succeeded = result?.ok === true;
  const onDismiss = succeeded ? onClose : onCancel;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const actionResult = await deleteTerminalOrder(orderId);
      setResult(actionResult);
    } catch (error) {
      console.error("Order deletion action failed unexpectedly", { orderId, error });
      setResult({ ok: false, error: "حدث خطأ غير متوقع أثناء حذف الطلب. حاول مرة أخرى." });
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={handleSubmit} className="contents">
    <OrderDeleteBackdrop dismissEnabled={result !== null} pending={pending} onDismiss={onDismiss}>
      <section role="alertdialog" aria-modal="true" aria-labelledby={`delete-order-title-${orderReference}`} className="max-h-[calc(100dvh-1.5rem)] w-[min(100%,26rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6">
        <h2 id={`delete-order-title-${orderReference}`} className="text-base font-bold text-text">{succeeded ? "اكتمل حذف الطلب" : "تأكيد حذف الطلب"}</h2>
        {succeeded ? <p role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-900">تم حذف الطلب {orderReference} وبياناته وإثباتات الدفع التابعة له.</p> : <>
          <p className="mt-2 text-sm leading-6 text-muted">سيُحذف الطلب {orderReference} وبنوده وإثباتات الدفع وسجل حالته نهائيًا. لا يمكن التراجع عن الحذف.</p>
          {result && !result.ok ? <p role="alert" className="mt-3 break-words rounded-lg border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{result.error ?? "تعذر حذف الطلب. حاول مرة أخرى."}</p> : null}
        </>}
        {succeeded ? <div className="mt-5 flex justify-end"><button type="button" onClick={onClose} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">إغلاق</button></div> : <DeleteDialogActions pending={pending} onCancel={onCancel} />}
      </section>
    </OrderDeleteBackdrop>
  </form>;
}

function OrderDeleteBackdrop({ children, dismissEnabled, pending, onDismiss }: { children: React.ReactNode; dismissEnabled: boolean; pending: boolean; onDismiss: () => void }) {
  return <div onClick={(event) => { if (event.target === event.currentTarget && dismissEnabled && !pending) onDismiss(); }} className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5">{children}</div>;
}

function DeleteDialogActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) {
  return <div className="mt-5 flex flex-wrap justify-end gap-2">
    <button type="button" disabled={pending} onClick={onCancel} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-text hover:bg-slate-50 disabled:opacity-60">إلغاء</button>
    <button type="submit" disabled={pending} aria-busy={pending} className="inline-flex min-h-10 min-w-28 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{pending ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /><span className="sr-only">جارٍ الحذف</span></> : "تأكيد الحذف"}</button>
  </div>;
}
