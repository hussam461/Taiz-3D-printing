"use client";

import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ORDER_STATUS_OPTIONS } from "@/lib/admin/order-labels";
import { completeOrderDelivery, reviewProof, updateOrderStatus } from "@/lib/admin/actions";
import { ORDER_TRANSITIONS } from "@/lib/orders/transitions";
import { formatMoney } from "@/lib/formatting/money";
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
  customer,
  allowStatusUpdate = true,
  balance,
  layout = "stacked",
}: {
  orderId: string;
  status: string;
  proofs: { id: string; status: string; createdAt?: string; mimeType?: string }[];
  customer?: { name: string; phone: string; reference: string };
  allowStatusUpdate?: boolean;
  layout?: "stacked" | "toolbar";
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
  const visibleNext = next.filter((value) => {
    return value !== "completed" && value !== "cancelled";
  });
  const canCompleteDelivery = allowStatusUpdate
    && status === "in_production"
    && balance?.paymentStatus === "proof_approved"
    && ["due", "paid", "not_due", "legacy_untracked"].includes(balance.status);

  return (
    <div className={layout === "toolbar" ? "contents" : "space-y-5"}>
      {canCompleteDelivery ? <div className={layout === "toolbar" ? "contents" : "flex justify-start"}>
        <ActionForm className={layout === "toolbar" ? "flex" : undefined} action={() => completeOrderDelivery(orderId)} successMessage={balanceDue ? "تم تسجيل التسليم وتحصيل المتبقي وإكمال الطلب." : "تم تسجيل التسليم وإكمال الطلب."} feedbackPlacement="toast">
          <ConfirmOrderDeliveryButton balanceDue={balanceDue} remaining={balance ? formatMoney(balance.payableRemaining, balance.currency) : ""} />
        </ActionForm>
      </div> : null}

      {allowStatusUpdate && (visibleNext.length > 0 || canCancel) ? (
        <ActionForm
          className={layout === "toolbar" ? "flex flex-wrap items-center gap-2" : "space-y-3 rounded-xl border border-border bg-surface p-4"}
          successMessage="تم تحديث حالة الطلب بنجاح."
          feedbackPlacement="toast"
          action={(formData) => updateOrderStatus(orderId, String(formData.get("to") ?? ""), String(formData.get("note") ?? ""))}
        >
          {layout !== "toolbar" ? <h3 className="font-semibold">إجراء الطلب</h3> : null}
          <div className="flex flex-wrap gap-2">{visibleNext.slice(0, 1).map((value) => <SubmitButton key={value} name="to" value={value} className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-white transition hover:bg-primary-hover" pendingLabel="جارٍ التحديث...">{ORDER_STATUS_OPTIONS[value] ?? "تحديث الحالة"}</SubmitButton>)}{canCancel ? <ConfirmSubmit name="to" value="cancelled" message="إلغاء الطلب نهائيًا؟" confirmPrompt="هل تريد إلغاء هذا الطلب؟" confirmLabel="نعم، ألغِ الطلب" pendingLabel="جارٍ الإلغاء..." className="min-h-11 rounded-lg border border-red-200 px-4 font-semibold text-red-700 hover:bg-red-50">إلغاء الطلب</ConfirmSubmit> : null}</div>
        </ActionForm>
      ) : allowStatusUpdate && next.length === 0 && !canCompleteDelivery && layout !== "toolbar" ? (
        <p className="rounded-xl bg-slate-50 p-4 text-sm text-muted">لا توجد إجراءات أخرى متاحة لهذه الحالة.</p>
      ) : null}
      {proofs.map((proof) => {
        const isPending = proof.status === "pending";
        const preview = <ProofPreview proofId={proof.id} mimeType={proof.mimeType}>
          {isPending ? <ProofDecisionControls proofId={proof.id} customer={customer} /> : null}
        </ProofPreview>;
        return (
          layout === "toolbar"
            ? <div key={proof.id} className="contents">{preview}</div>
            : <section key={proof.id} className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap items-center gap-2 text-sm text-muted">{preview}</div></section>
        );
      })}
    </div>
  );
}

function ProofDecisionControls({ proofId, customer }: { proofId: string; customer?: { name: string; phone: string; reference: string } }) {
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);
  const [showWhatsAppPrompt, setShowWhatsAppPrompt] = useState(false);
  const [submittingChoice, setSubmittingChoice] = useState("");
  const phone = customer?.phone?.trim() ?? "";
  const approvalMessage = customer
    ? `السلام عليكم ${customer.name}، تم اعتماد إثبات العربون لطلبك ${customer.reference}، وبدأنا تجهيز الطلب. شكرًا لثقتك بنا.`
    : "السلام عليكم، تم اعتماد إثبات العربون وبدأنا تجهيز الطلب. شكرًا لثقتك بنا.";

  return <div className="space-y-3">
    {!decision ? <div className="flex flex-wrap justify-center gap-2">
      <button type="button" onClick={() => { setDecision("approved"); setShowWhatsAppPrompt(false); }} className="min-h-10 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover">اعتماد العربون وبدء التجهيز</button>
      <button type="button" onClick={() => { setDecision("rejected"); setShowWhatsAppPrompt(false); }} className="min-h-10 rounded-xl border border-red-200 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-50">رفض الإثبات</button>
    </div> : <ActionForm
      key={decision}
      className="mx-auto max-w-2xl space-y-2 rounded-xl border border-border bg-slate-50 p-2.5"
      successMessage={decision === "approved" ? "تم اعتماد العربون وبدأ تجهيز الطلب." : "تم رفض الإثبات."}
      feedbackPlacement="toast"
      action={(formData) => reviewProof(proofId, decision, String(formData.get("reason") ?? ""), String(formData.get("send_whatsapp") ?? "") === "yes", String(formData.get("message") ?? ""))}
      onSubmit={(event) => {
        const submitter = event.nativeEvent instanceof SubmitEvent ? event.nativeEvent.submitter as HTMLButtonElement | null : null;
        setSubmittingChoice(submitter?.value ?? "");
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-text">{decision === "approved" ? "اعتماد إثبات الدفع" : "رفض إثبات الدفع"}</p>
        <button type="button" onClick={() => { setDecision(null); setShowWhatsAppPrompt(false); }} className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-muted hover:bg-white">إلغاء</button>
      </div>
      {decision === "rejected" ? <label className="block space-y-1 text-sm"><span className="font-medium text-text">سبب الرفض <span className="font-normal text-muted">اختياري</span></span><textarea name="reason" rows={2} className="w-full rounded-lg border border-border bg-white px-3 py-2" /></label> : <label className="block space-y-1 text-sm"><span className="font-medium text-text">رسالة واتساب</span><textarea name="message" rows={3} defaultValue={approvalMessage} className="w-full rounded-lg border border-border bg-white px-3 py-2 leading-5" /></label>}
      {!showWhatsAppPrompt ? <button type="button" onClick={() => setShowWhatsAppPrompt(true)} className={`min-h-10 rounded-lg px-4 text-sm font-semibold text-white ${decision === "approved" ? "bg-primary hover:bg-primary-hover" : "bg-red-600 hover:bg-red-700"}`}>{decision === "approved" ? "تأكيد الاعتماد" : "تأكيد الرفض"}</button> : <div className="space-y-2 rounded-lg border border-border bg-white p-3">
        <p className="text-sm font-semibold text-text">{decision === "approved" ? "هل تريد إرسال رسالة الاعتماد إلى العميل عبر واتساب؟" : "هل تريد إرسال سبب الرفض إلى العميل عبر واتساب؟"}</p>
        {!phone ? <p className="text-xs text-muted">رقم العميل غير متوفر.</p> : null}
        <div className="flex flex-wrap gap-2">
          {phone ? <ProofDecisionSubmitButton name="send_whatsapp" value="yes" selected={submittingChoice} onSelect={setSubmittingChoice} pendingLabel="جارٍ الحفظ..." className={`min-h-10 rounded-lg px-4 text-sm font-semibold text-white ${decision === "approved" ? "bg-primary hover:bg-primary-hover" : "bg-red-600 hover:bg-red-700"}`}>{decision === "approved" ? "نعم، أرسل عبر واتساب" : "نعم، أرسل السبب"}</ProofDecisionSubmitButton> : null}
          <ProofDecisionSubmitButton name="send_whatsapp" value="no" selected={submittingChoice} onSelect={setSubmittingChoice} pendingLabel="جارٍ الحفظ..." className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-text">{decision === "approved" ? "اعتماد بدون إرسال" : "رفض بدون إرسال"}</ProofDecisionSubmitButton>
          <button type="button" onClick={() => setShowWhatsAppPrompt(false)} className="min-h-10 rounded-lg px-3 text-sm text-muted hover:bg-slate-100">رجوع</button>
        </div>
      </div>}
    </ActionForm>}
  </div>;
}

function ProofDecisionSubmitButton({ children, name, value, selected, onSelect, pendingLabel, className }: { children: React.ReactNode; name: string; value: string; selected: string; onSelect: (value: string) => void; pendingLabel: string; className: string }) {
  const { pending } = useFormStatus();
  const isCurrent = pending && selected === value;
  return <button type="submit" name={name} value={value} disabled={pending} aria-busy={isCurrent} onClick={() => onSelect(value)} className={`${className} inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}>
    {isCurrent ? <><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current/25 border-t-current" /><span className="sr-only">{pendingLabel}</span></> : children}
  </button>;
}

function ConfirmOrderDeliveryButton({ balanceDue, remaining }: { balanceDue: boolean; remaining: string }) {
  const { pending } = useFormStatus();
  const [confirming, setConfirming] = useState(false);
  if (!confirming) return <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-green-700 px-4 font-semibold text-white transition hover:bg-green-800">تسجيل التسليم</button>;
  return <span role="group" aria-label="تأكيد تسليم الطلب" className="inline-flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2"><span className="text-xs text-amber-950">{balanceDue ? "هل سلّمت الطلب واستلمت المتبقي " + remaining + "؟" : "هل سلّمت الطلب للعميل فعلًا؟"}</span><SubmitButton disabled={pending} pendingLabel="جارٍ التسجيل..." className="min-h-9 rounded-md bg-green-700 px-3 text-xs font-semibold text-white">نعم، أكّد التسليم</SubmitButton><button type="button" disabled={pending} onClick={() => setConfirming(false)} className="min-h-9 rounded-md bg-white px-3 text-xs font-semibold text-text">إلغاء</button></span>;
}
