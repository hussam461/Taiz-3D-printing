"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SectionCard } from "@/components/admin/ui";

type SaveAction = (formData: FormData) => Promise<{ ok: boolean; error?: string; id?: string } | void>;

export function SaveChangesForm({
  action,
  successMessage,
  title,
  description,
  buttonLabel,
  children,
}: {
  action: SaveAction;
  successMessage: string;
  title: string;
  description: string;
  buttonLabel: string;
  children: React.ReactNode;
}) {
  const [dirty, setDirty] = useState(false);

  return (
    <ActionForm
      action={action}
      successMessage={successMessage}
      className="space-y-4"
      onChange={() => setDirty(true)}
      onSuccess={() => setDirty(false)}
    >
      <SectionCard title={title} description={description}>
        {children}
        <div className="mt-4 flex justify-end border-t border-border pt-3">
          <SubmitButton
            disabled={!dirty}
            pendingLabel="جارٍ الحفظ..."
            className="min-h-11 w-full rounded-xl bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover sm:w-auto"
          >
            {buttonLabel}
          </SubmitButton>
        </div>
      </SectionCard>
    </ActionForm>
  );
}
