"use client";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { BALANCE_STATUS_LABELS, PAYMENT_PROOF_STATUS_LABELS, ORDER_STATUS_OPTIONS } from "@/lib/admin/order-labels";
import { completeOrderDelivery, reviewProof, updateOrderStatus } from "@/lib/admin/actions";
import { ORDER_TRANSITIONS } from "@/lib/orders/transitions";
import { currencyLabel, formatMoney, formatOldYer } from "@/lib/formatting/money";
import type { PaymentCurrency } from "@/types/domain";
import { requiresBalanceCollection } from "@/lib/orders/balance";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { ProofPreview } from "@/components/admin/proof-preview";

export function OrderActions({
  orderId,
  status,
  proofs,
  allowStatusUpdate = true,
  balance,
}: {
  orderId: string;
  status: string;
  proofs: { id: string; status: string; createdAt?: string; mimeType?: string }[];
  allowStatusUpdate?: boolean;
  balance?: {
    status: string;
    remainingOldYer: number;
    payableRemaining: number;
    currency: PaymentCurrency;
    paidAt: string | null;
    orderStatus: string;
    paymentStatus: string;
  };
}) {
  const next = ORDER_TRANSITIONS[status] ?? [];
  const canCancel = next.includes("cancelled");
  const balanceDue = requiresBalanceCollection(balance?.status, balance?.remainingOldYer ?? 0, balance?.orderStatus);
  const shownBalanceStatus = balance?.orderStatus === "cancelled" && balance.status === "due" ? "cancelled_due" : balance?.status;
  const visibleNext = next.filter((value) => {
    // Record delivery through the single audited action below.
    return value !== "shipped" && value !== "completed" && value !== "cancelled";
  });
  const canCompleteDelivery = allowStatusUpdate
    && (status === "ready" || status === "shipped")
    && balance?.paymentStatus === "proof_approved"
    && ["due", "paid", "not_due", "legacy_untracked"].includes(balance.status);

  return (
    <div className="space-y-5">
      {balance ? <section className="space-y-3 rounded-xl border border-border bg-surface p-4" aria-labelledby="balance-collection-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 id="balance-collection-title" className="font-semibold">المبلغ المتبقي عند التسليم</h3><p className="mt-1 text-sm text-muted">{BALANCE_STATUS_LABELS[shownBalanceStatus ?? ""] ?? "حالة التحصيل غير معروفة"}</p></div>
          {balance.status === "due" ? <div className="text-end"><p className="font-bold text-amber-900">{formatMoney(balance.payableRemaining, balance.currency)}</p><p className="mt-1 text-xs text-muted">{formatOldYer(balance.remainingOldYer)} · {currencyLabel(balance.currency)}</p></div> : null}
        </div>
        {balance.status === "due" && balance.orderStatus === "cancelled" ? <p className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-muted">لن يُحصّل المتبقي لأن الطلب أُلغي. راجع سياسة العربون والإرجاع لمعالجة ما تم دفعه.</p> : null}
        {balance.status === "due" && !["ready", "shipped", "cancelled"].includes(balance.orderStatus) ? <p className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-950">المتبقي {formatMoney(balance.payableRemaining, balance.currency)} يُحصّل عند تسليم الطلب للعميل.</p> : null}
        {balance.status === "due" && balance.orderStatus === "ready" ? <p className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-950">الطلب جاهز. المتبقي {formatMoney(balance.payableRemaining, balance.currency)} مستحق عند استلام العميل.</p> : null}
        {balance.status === "due" && balance.orderStatus === "shipped" ? <p className="rounded-lg bg-blue-50 p-3 text-sm leading-6 text-blue-950">هذا طلب قديم في مسار التسليم السابق. سجّل التسليم والتحصيل من الزر أدناه.</p> : null}
        {canCompleteDelivery ? <ActionForm action={() => completeOrderDelivery(orderId)} successMessage={balanceDue ? "تم تسجيل التسليم وتحصيل المتبقي وإكمال الطلب." : "تم تسجيل التسليم وإكمال الطلب."} feedbackPlacement="toast">
          <ConfirmOrderDeliveryButton balanceDue={balanceDue} remaining={balance ? formatMoney(balance.payableRemaining, balance.currency) : ""} />
        </ActionForm> : null}
        {allowStatusUpdate && (status === "ready" || status === "shipped") && balance?.paymentStatus !== "proof_approved" ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950">اعتمد إثبات العربون قبل تسجيل التسليم.</p> : null}
        {balance.status === "paid" ? <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900">تم تسجيل استلام {formatMoney(balance.payableRemaining, balance.currency)}{balance.paidAt ? ` بتاريخ ${new Date(balance.paidAt).toLocaleString("ar-YE-u-nu-latn")}` : ""}.{balance.orderStatus === "completed" ? " اكتمل الطلب." : " سجّل التسليم بعد تسليم الطلب للعميل."}</p> : null}
        {balance.status === "not_due" ? <p className="rounded-lg bg-green-50 p-3 text-sm text-green-900">قيمة هذا الطلب مسددة بالكامل، ولا يوجد مبلغ متبقٍ.</p> : null}
        {balance.status === "legacy_untracked" ? <p className="rounded-lg bg-slate-50 p-3 text-sm text-muted">هذا الطلب أُنشئ قبل تفعيل تتبع المتبقي. لن يمنع إكماله، ولا يفترض النظام أن المبلغ سُدد أو بقي مستحقًا.</p> : null}
      </section> : null}

      {allowStatusUpdate && (visibleNext.length > 0 || canCancel) ? (
        <ActionForm
          className="space-y-3 rounded-xl border border-border bg-surface p-4"
          successMessage="تم تحديث حالة الطلب بنجاح."
          feedbackPlacement="toast"
          action={(formData) => updateOrderStatus(orderId, String(formData.get("to") ?? ""), String(formData.get("note") ?? ""))}
        >
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">إجراء الطلب</h3><p className="mt-1 text-sm text-muted">الخطوة المناسبة فقط تظهر هنا.</p></div><div className="flex flex-wrap gap-2">{visibleNext.slice(0, 1).map((value) => <SubmitButton key={value} name="to" value={value} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white transition hover:bg-primary-hover" pendingLabel="جارٍ التحديث...">{ORDER_STATUS_OPTIONS[value] ?? "تحديث الحالة"}</SubmitButton>)}{canCancel ? <ConfirmSubmit name="to" value="cancelled" message="إلغاء الطلب نهائيًا؟" confirmPrompt="هل تريد إلغاء هذا الطلب؟" confirmLabel="نعم، ألغِ الطلب" pendingLabel="جارٍ الإلغاء..." className="min-h-11 rounded-lg border border-red-200 px-4 font-semibold text-red-700 hover:bg-red-50">إلغاء الطلب</ConfirmSubmit> : null}</div></div>
        </ActionForm>
      ) : allowStatusUpdate && next.length === 0 && !canCompleteDelivery ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">لا توجد إجراءات أخرى متاحة لهذه الحالة.</p>
      ) : null}
      {proofs.map((proof) => {
        const isPending = proof.status === "pending";
        return (
          <section key={proof.id} className="space-y-3 rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">مراجعة إثبات الدفع</h3>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${proof.status === "approved" ? "bg-green-50 text-green-800" : proof.status === "rejected" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
                {PAYMENT_PROOF_STATUS_LABELS[proof.status] ?? "حالة غير معروفة"}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">{proof.createdAt ? <time>رُفع في {new Date(proof.createdAt).toLocaleString("ar-YE-u-nu-latn")}</time> : null}<ProofPreview proofId={proof.id} mimeType={proof.mimeType} /></div>
            {isPending ? (
              <ActionForm
                className="space-y-3"
                successMessage="تمت مراجعة الإثبات وتحديث حالة الطلب."
                feedbackPlacement="toast"
                action={(formData) => reviewProof(proof.id, String(formData.get("decision")) as "approved" | "rejected", String(formData.get("reason") ?? ""))}
              >
                <label className="space-y-1 text-sm">
                  <span className="font-medium">ملاحظة للعميل عند الرفض (مطلوبة عند الرفض)</span>
                  <textarea name="reason" rows={2} onChange={(event) => event.currentTarget.setCustomValidity("")} placeholder="مثال: صورة التحويل غير واضحة؛ أرسل صورة كاملة يظهر فيها المبلغ ورقم العملية." className="w-full rounded-lg border border-border px-3 py-2" />
                </label>
                <div className="flex flex-wrap items-center gap-2"><SubmitButton name="decision" value="approved" pendingLabel="جارٍ الاعتماد..." className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white transition hover:bg-primary-hover">اعتماد العربون وبدء التجهيز</SubmitButton><ConfirmSubmit name="decision" value="rejected" message="سيُحفظ سبب الرفض مع الإثبات." confirmPrompt="تأكيد رفض إثبات الدفع؟" confirmLabel="نعم، ارفض الإثبات" pendingLabel="جارٍ الرفض..." className="min-h-11 rounded-lg border border-red-200 px-4 font-semibold text-red-700 hover:bg-red-50">رفض الإثبات</ConfirmSubmit></div>
              </ActionForm>
            ) : (
              <p className="text-sm text-muted">تمت مراجعة هذا الإثبات.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ConfirmOrderDeliveryButton({ balanceDue, remaining }: { balanceDue: boolean; remaining: string }) {
  const { pending } = useFormStatus();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-green-700 px-4 font-semibold text-white transition hover:bg-green-800">تسجيل التسليم</button>;
  return <span role="group" aria-label="تأكيد تسليم الطلب" className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2"><span className="text-xs text-amber-950">{balanceDue ? "هل سلّمت الطلب واستلمت المتبقي " + remaining + "؟" : "هل سلّمت الطلب للعميل فعلًا؟"}</span><SubmitButton disabled={pending} pendingLabel="جارٍ التسجيل..." className="min-h-9 rounded-md bg-green-700 px-3 text-xs font-semibold text-white">نعم، أكّد التسليم</SubmitButton><button type="button" disabled={pending} onClick={() => setConfirming(false)} className="min-h-9 rounded-md bg-white px-3 text-xs font-semibold text-text">إلغاء</button></span>;
}
