"use client";

import { Children, isValidElement, useEffect, useState } from "react";
import { PaymentProofBulkDeleteBar, PaymentProofSelectionProvider } from "@/components/admin/payment-proof-selection";

export function PaymentProofBatches({ listKey, batchNumber, selectableIds, children }: {
  listKey: string;
  batchNumber: number;
  selectableIds: string[];
  children: React.ReactNode;
}) {
  const [state, setState] = useState({ listKey, selectableIds, content: children });

  useEffect(() => {
    setState({ listKey, selectableIds, content: children });
  }, [listKey, batchNumber, children, selectableIds]);

  const currentState = state.listKey === listKey ? state : { listKey, selectableIds, content: children };
  const removeDeletedIds = (ids: string[]) => {
    const deletedIds = new Set(ids);
    setState((current) => ({
      ...current,
      selectableIds: current.selectableIds.filter((id) => !deletedIds.has(id)),
      content: Children.toArray(current.content).filter((child) => {
        if (!isValidElement<{ "data-proof-id"?: string }>(child)) return true;
        const proofId = child.props["data-proof-id"];
        return !proofId || !deletedIds.has(proofId);
      }),
    }));
  };

  return <PaymentProofSelectionProvider key={listKey} selectableIds={currentState.selectableIds} onDeleteSuccess={removeDeletedIds}>
    <PaymentProofBulkDeleteBar />
    <div className="space-y-4">{currentState.content}</div>
  </PaymentProofSelectionProvider>;
}
