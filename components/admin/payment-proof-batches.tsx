"use client";

import { Children, isValidElement, useState } from "react";
import { PaymentProofBulkDeleteBar, PaymentProofSelectionProvider } from "@/components/admin/payment-proof-selection";

export function PaymentProofBatches({ listKey, batchNumber, selectableIds, children }: {
  listKey: string;
  batchNumber: number;
  selectableIds: string[];
  children: React.ReactNode;
}) {
  const [state, setState] = useState({ listKey, batchNumber, deletedIds: [] as string[] });
  const currentState = state.listKey === listKey && state.batchNumber === batchNumber
    ? state
    : { listKey, batchNumber, deletedIds: [] as string[] };
  const deletedIds = new Set(currentState.deletedIds);
  const visibleIds = selectableIds.filter((id) => !deletedIds.has(id));
  const visibleContent = Children.toArray(children).filter((child) => {
    if (!isValidElement<{ "data-proof-id"?: string }>(child)) return true;
    const proofId = child.props["data-proof-id"];
    return !proofId || !deletedIds.has(proofId);
  });
  const removeDeletedIds = (ids: string[]) => {
    setState((current) => {
      const previousDeletedIds = current.listKey === listKey && current.batchNumber === batchNumber
        ? current.deletedIds
        : [];
      return { listKey, batchNumber, deletedIds: [...new Set([...previousDeletedIds, ...ids])] };
    });
  };

  return <PaymentProofSelectionProvider key={listKey} selectableIds={visibleIds} onDeleteSuccess={removeDeletedIds}>
    <PaymentProofBulkDeleteBar />
    <div className="space-y-4">{visibleContent}</div>
  </PaymentProofSelectionProvider>;
}
