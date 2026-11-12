"use client";

import { createContext, useActionState, useContext, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/admin/action-form";
import { deletePaymentProofs } from "@/lib/admin/actions";

type SelectionContextValue = {
  selectableIds: string[];
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  removeDeletedIds: (ids: string[]) => void;
};

const SelectionContext = createContext<SelectionContextValue | null>(null);
const MAX_SELECTED_PROOFS = 500;
type BulkDeleteResult = { ok: boolean; error?: string } | null;

export function PaymentProofSelectionProvider({ selectableIds, children, onDeleteSuccess }: { selectableIds: string[]; children: React.ReactNode; onDeleteSuccess?: (ids: string[]) => void }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const removeDeletedIds = (ids: string[]) => {
    const deletedIds = new Set(ids);
    setSelectedIds((current) => current.filter((id) => !deletedIds.has(id)));
    onDeleteSuccess?.(ids);
  };
  return <SelectionContext.Provider value={{ selectableIds, selectedIds, setSelectedIds, removeDeletedIds }}>{children}</SelectionContext.Provider>;
}

export function PaymentProofSelectCheckbox({ proofId }: { proofId: string }) {
  const selection = useSelection();
  const checked = selection.selectedIds.includes(proofId);
  const selectionLimitReached = selection.selectedIds.length >= MAX_SELECTED_PROOFS;
  return <label className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-white px-2.5 text-xs font-medium text-muted hover:bg-slate-50">
    <input
      type="checkbox"
      checked={checked}
      disabled={!checked && selectionLimitReached}
      onChange={(event) => selection.setSelectedIds(event.target.checked
        ? [...selection.selectedIds, proofId]
        : selection.selectedIds.filter((id) => id !== proofId))}
      aria-label={checked ? "إلغاء تحديد الإثبات" : "تحديد الإثبات"}
      className="h-4 w-4 accent-primary disabled:cursor-not-allowed disabled:opacity-50"
    />
    تحديد
  </label>;
}

export function PaymentProofBulkDeleteBar() {
  const { selectableIds, selectedIds, setSelectedIds, removeDeletedIds } = useSelection();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  if (!selectableIds.length) return null;

  const visibleSelectionIds = selectableIds.slice(0, MAX_SELECTED_PROOFS);
  const allSelected = visibleSelectionIds.length > 0 && visibleSelectionIds.every((id) => selectedIds.includes(id));
  const closeAfterSuccess = (proofIds: string[]) => {
    removeDeletedIds(proofIds);
    setConfirming(false);
    router.refresh();
  };

  return <>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-semibold text-text transition hover:bg-slate-50">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(event) => setSelectedIds(event.target.checked ? visibleSelectionIds : [])}
            aria-label={allSelected ? "إلغاء تحديد الإثباتات المعروضة" : "تحديد الإثباتات المعروضة"}
            className="h-4 w-4 accent-primary"
          />
          تحديد المعروض
        </label>
        <span aria-live="polite" className="text-sm text-muted">
          المحدد <span className="font-semibold tabular-nums text-text">{selectedIds.length.toLocaleString("ar-YE-u-nu-latn")}</span> من {selectableIds.length.toLocaleString("ar-YE-u-nu-latn")}
          {selectableIds.length > MAX_SELECTED_PROOFS ? <span className="ms-1 text-xs">(حتى 500 في العملية)</span> : null}
        </span>
      </div>
      {selectedIds.length ? <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100"
      >
        حذف المحدد ({selectedIds.length.toLocaleString("ar-YE-u-nu-latn")})
      </button> : null}
    </div>

    {confirming ? <BulkDeleteProofDialog proofIds={selectedIds} onCancel={() => setConfirming(false)} onClose={closeAfterSuccess} /> : null}
  </>;
}

function BulkDeleteProofDialog({ proofIds, onCancel, onClose }: { proofIds: string[]; onCancel: () => void; onClose: (ids: string[]) => void }) {
  const [result, formAction] = useActionState(async (_previous: BulkDeleteResult, formData: FormData) => deletePaymentProofs(formData), null);
  const succeeded = result?.ok === true;

  return <form action={formAction} className="contents">
    {proofIds.map((id) => <input key={id} type="hidden" name="proofIds" value={id} />)}
    <DismissibleBulkDeleteBackdrop dismissEnabled={result !== null} onDismiss={succeeded ? () => onClose(proofIds) : onCancel}>
    <section role="alertdialog" aria-modal="true" aria-labelledby="bulk-delete-proofs-title" className="max-h-[calc(100dvh-1.5rem)] w-[min(100%,28rem)] overflow-y-auto rounded-2xl border border-border bg-white p-4 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6">
      <h2 id="bulk-delete-proofs-title" className="text-base font-bold text-text">{succeeded ? "اكتمل حذف الإثباتات" : "تأكيد حذف الإثباتات المحددة"}</h2>
      {succeeded ? <p role="status" className="mt-3 rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-900">حُذفت {proofIds.length.toLocaleString("ar-YE-u-nu-latn")} إثباتات وملفاتها بنجاح.</p> : <>
        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-900">عدد الإثباتات: {proofIds.length.toLocaleString("ar-YE-u-nu-latn")}</p>
          <p className="mt-1 text-sm leading-6 text-red-800">سيُحذف كل إثبات محدد وملفه نهائيًا. لا يمكن التراجع عن الحذف.</p>
        </div>
        {result && !result.ok ? <p role="alert" className="mt-3 break-words rounded-lg border border-red-200 bg-white p-3 text-sm leading-5 text-red-800">{result.error ?? "تعذر حذف الإثباتات المحددة. حاول مرة أخرى."}</p> : null}
      </>}
      {succeeded
        ? <div className="mt-5 flex justify-end"><button type="button" onClick={() => onClose(proofIds)} className="min-h-10 rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-hover">إغلاق</button></div>
        : <BulkDeleteConfirmationActions onCancel={onCancel} />}
    </section>
    </DismissibleBulkDeleteBackdrop>
  </form>;
}

function DismissibleBulkDeleteBackdrop({ children, dismissEnabled, onDismiss }: { children: React.ReactNode; dismissEnabled: boolean; onDismiss: () => void }) {
  const { pending } = useFormStatus();
  return <div
    onClick={(event) => { if (event.target === event.currentTarget && dismissEnabled && !pending) onDismiss(); }}
    className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-3 sm:p-5"
  >{children}</div>;
}

function BulkDeleteConfirmationActions({ onCancel }: { onCancel: () => void }) {
  const { pending } = useFormStatus();
  return <div className="mt-5 flex flex-wrap justify-end gap-2">
    <button type="button" disabled={pending} onClick={onCancel} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold text-text hover:bg-slate-50 disabled:opacity-60">إلغاء</button>
    <SubmitButton spinnerOnly pendingLabel="جارٍ الحذف" className="inline-flex min-h-10 min-w-28 items-center justify-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700" ariaLabel="تأكيد حذف الإثباتات المحددة">تأكيد الحذف</SubmitButton>
  </div>;
}

export function usePaymentProofSelection() {
  return useSelection();
}

function useSelection() {
  const selection = useContext(SelectionContext);
  if (!selection) throw new Error("Payment proof selection components must be used inside their provider.");
  return selection;
}
