"use client";

import { useState } from "react";
import { saveSimpleRow, deleteSimpleRow } from "@/lib/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";

const inputClass = "mt-1 w-full rounded-xl border border-border bg-white px-3.5 py-3 text-sm shadow-sm transition focus:border-primary focus:ring-4 focus:ring-primary/10";
const NEW_DEFAULT = "__new_default__";

type FieldDefinition = {
  name: string;
  label: string;
  hint?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
};

export function SimpleCrud({ table, rows, fields, polished = false }: { table: string; rows: Record<string, unknown>[]; fields: FieldDefinition[]; polished?: boolean }) {
  const supportsDefault = ["colors", "materials", "delivery_areas"].includes(table);
  const persistedDefaultId = String(rows.find((row) => row.is_default === true)?.id ?? "") || null;
  const [selection, setSelection] = useState({ baseId: persistedDefaultId, value: persistedDefaultId });
  const [createOpen, setCreateOpen] = useState(!polished);
  const [dirtyRows, setDirtyRows] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState("");
  const defaultId = selection.baseId === persistedDefaultId ? selection.value : persistedDefaultId;
  const visibleRows = table === "delivery_areas" && search.trim()
    ? rows.filter((row) => String(row.governorate ?? "").toLocaleLowerCase("ar").includes(search.trim().toLocaleLowerCase("ar")))
    : rows;

  function setDefaultId(value: string | null) {
    setSelection({ baseId: persistedDefaultId, value });
  }

  function changeDefault(id: string, checked: boolean) {
    if (checked) setDefaultId(id);
    else if (defaultId === id) setDefaultId(persistedDefaultId === id ? null : persistedDefaultId);
  }

  function handleSaveSuccess(result: { id?: string }, formData: FormData) {
    if (!supportsDefault) return;
    const rowId = String(formData.get("id") ?? "");
    const savedId = String(result.id ?? rowId);
    if (formData.get("is_default") === "on" && savedId) setDefaultId(savedId);
    else if (rowId && rowId === persistedDefaultId) setDefaultId(null);
    else if (defaultId === NEW_DEFAULT || (defaultId && defaultId !== persistedDefaultId)) setDefaultId(persistedDefaultId);
  }

  const createAction = saveSimpleRow.bind(null, table);
  const entityName = table === "colors" ? "اللون" : table === "materials" ? "الخامة" : table === "delivery_areas" ? "منطقة التوصيل" : table === "payment_accounts" ? "حساب الدفع" : "العنصر";

  return (
    <div className="space-y-8">
      <section className={polished ? "space-y-3" : "overflow-hidden rounded-2xl border border-border bg-white shadow-sm rounded-3xl bg-surface"}>
        <div className={`flex items-center justify-between gap-4 ${polished ? "" : "border-b border-border px-5 py-5 md:px-7"}`}>
          {polished ? <button type="button" aria-expanded={createOpen} onClick={() => setCreateOpen((open) => !open)} className={`ms-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold shadow-sm transition ${createOpen ? "border border-border bg-white text-muted hover:bg-slate-50" : "bg-primary text-white hover:bg-primary-hover"}`}>
            <span aria-hidden="true" className="text-lg leading-none">{createOpen ? "×" : "+"}</span>{createOpen ? "إلغاء" : table === "delivery_areas" ? "إضافة منطقة" : `إضافة ${entityName}`}
          </button> : <><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">إضافة جديد</p><h2 className="mt-1 text-xl font-bold">إنشاء عنصر</h2></div><span className="hidden rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary sm:inline-flex">نموذج جديد</span></>}
        </div>
      {createOpen ? <ActionForm
          action={createAction}
          successMessage="تمت الإضافة بنجاح."
        onSuccess={(result, formData) => { handleSaveSuccess(result, formData); if (polished) setCreateOpen(false); }}
          resetOnSuccess
          className={`grid md:grid-cols-2 ${polished ? "grid-cols-1 gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm sm:grid-cols-2 sm:p-5" : "gap-5 px-5 pb-5 md:px-7 md:pb-7"}`}
        >
          {fields.map((field) => (
            <Field
              key={field.name}
              field={field}
              checked={supportsDefault && field.name === "is_default" ? defaultId === NEW_DEFAULT : undefined}
              onCheckedChange={supportsDefault && field.name === "is_default" ? (checked) => changeDefault(NEW_DEFAULT, checked) : undefined}
            />
          ))}
          <SubmitButton className={`mt-1 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover ${polished ? "sm:col-span-2 sm:justify-self-end" : "md:col-span-2 md:justify-self-end"}`} pendingLabel="جارٍ الإضافة...">إضافة {entityName}</SubmitButton>
      </ActionForm> : null}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-xs font-semibold uppercase tracking-wider text-primary">إدارة المحتوى</p><h2 className="mt-1 text-xl font-bold">{table === "colors" ? "الألوان الحالية" : table === "materials" ? "الخامات الحالية" : table === "delivery_areas" ? "مناطق التوصيل الحالية" : "العناصر الحالية"}</h2></div>
          <div className="flex min-w-0 items-center gap-2 sm:w-auto">
            {table === "delivery_areas" ? <input type="search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} aria-label="البحث عن منطقة توصيل باسم المحافظة" placeholder="ابحث باسم المحافظة..." className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/15 sm:w-64 sm:flex-none" /> : null}
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-sm text-muted">{table === "delivery_areas" && search.trim() ? `${visibleRows.length} من ${rows.length}` : rows.length} عنصر</span>
          </div>
        </div>
        {rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface p-10 text-center text-sm text-muted">لا توجد عناصر حتى الآن.</div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white px-5 py-10 text-center text-sm text-muted">لا توجد منطقة تطابق بحثك. جرّب اسم محافظة آخر.</div>
        ) : <div className={polished ? table === "payment_accounts" ? "grid grid-cols-2 gap-3 sm:gap-4" : "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 2xl:grid-cols-4" : "space-y-4"}>{visibleRows.map((row) => {
          const id = String(row.id ?? row.slug ?? "");
          const updateAction = saveSimpleRow.bind(null, table);
          const removeAction = deleteSimpleRow.bind(null, table, id);
          return (
            <div key={id} className={`min-w-0 rounded-2xl border border-border bg-white p-2.5 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-4 ${polished ? "" : "rounded-3xl bg-surface md:p-6"}`}>
              <ActionForm
                action={updateAction}
                successMessage="تم تحديث العنصر."
                onSuccess={(result, formData) => { handleSaveSuccess(result, formData); setDirtyRows((current) => ({ ...current, [id]: false })); }}
                onChange={(event) => {
                  if (!polished) return;
                  const form = event.currentTarget;
                  const changed = fields.some((field) => {
                    const control = form.elements.namedItem(field.name);
                    if (!control) return false;
                    if (field.type === "checkbox") return (control as HTMLInputElement).checked !== Boolean(row[field.name]);
                    return String((control as HTMLInputElement).value ?? "") !== String(row[field.name] ?? "");
                  });
                  setDirtyRows((current) => current[id] === changed ? current : { ...current, [id]: changed });
                }}
                className={`grid ${polished ? table === "payment_accounts" ? "grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3" : "grid-cols-1 gap-2.5 2xl:grid-cols-2 sm:gap-3" : "gap-5 md:grid-cols-2"}`}
              >
                <input type="hidden" name="id" value={id} />
                {table === "categories" ? <input type="hidden" name="current_slug" value={String(row.slug ?? "")} /> : null}
                {fields.map((field) => (
                  <Field
                    key={field.name}
                    field={field}
                    value={row[field.name]}
                    checked={supportsDefault && field.name === "is_default" ? defaultId === id : undefined}
                    onCheckedChange={supportsDefault && field.name === "is_default" ? (checked) => changeDefault(id, checked) : undefined}
                  />
                ))}
                <SubmitButton disabled={polished && !dirtyRows[id]} className={`min-h-10 rounded-xl px-4 text-xs font-semibold transition ${polished ? `w-full border border-teal-700 text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 ${table === "payment_accounts" ? "sm:col-span-2" : "2xl:col-span-2"}` : "border border-border bg-white py-3 text-sm hover:border-primary hover:bg-blue-50 md:col-span-2"}`} pendingLabel="جارٍ الحفظ...">حفظ التعديلات</SubmitButton>
              </ActionForm>
              <ActionForm action={removeAction} successMessage="تم حذف العنصر." className={`mt-1 flex ${polished ? "justify-start" : "border-t border-border pt-4"}`}>
                <ConfirmSubmit compact={polished} confirmPrompt="تأكيد الحذف؟" confirmLabel="حذف" message="هل تريد حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية." className="min-h-8 rounded-lg px-2 py-1 text-xs font-semibold text-error transition hover:bg-red-50">{polished ? "حذف" : "حذف هذا العنصر"}</ConfirmSubmit>
              </ActionForm>
            </div>
          );
        })}</div>}
      </section>
    </div>
  );
}

function Field({ field, value, checked, onCheckedChange }: { field: FieldDefinition; value?: unknown; checked?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  if (field.type === "checkbox") {
    const defaultChecked = value === undefined ? field.name === "is_active" : Boolean(value);
    return (
      <label className="rounded-xl border border-border bg-slate-50 p-3.5 text-sm">
        <span className="flex items-center gap-3">
          {onCheckedChange ? (
            <input type="checkbox" name={field.name} checked={Boolean(checked)} onChange={(event) => onCheckedChange(event.currentTarget.checked)} className="h-4 w-4 accent-primary" />
          ) : (
            <input type="checkbox" name={field.name} defaultChecked={defaultChecked} className="h-4 w-4 accent-primary" />
          )}
          {field.label}
        </span>
        {field.hint ? <span className="mt-2 block text-xs font-normal leading-5 text-muted">{field.hint}</span> : null}
      </label>
    );
  }
  return (
    <label className="text-sm font-semibold text-text">
      <span className="inline-flex items-baseline gap-1 whitespace-nowrap">{field.label}{field.required === false ? <span className="text-[11px] font-normal text-muted">(اختياري)</span> : null}</span>
      {field.hint ? <span className="mt-1 block text-xs font-normal leading-5 text-muted">{field.hint}</span> : null}
      {field.type === "textarea" ? (
        <textarea name={field.name} required={field.required !== false} placeholder={field.placeholder} defaultValue={String(value ?? "")} rows={4} className={inputClass} />
      ) : field.type === "color" ? (
        <input name={field.name} required={field.required !== false} type="color" defaultValue={/^#[0-9a-fA-F]{6}$/.test(String(value ?? "")) ? String(value) : "#64748b"} className="mt-1 h-12 w-full cursor-pointer rounded-xl border border-border bg-white p-1.5 shadow-sm" />
      ) : field.options ? (
        <select name={field.name} required={field.required !== false} defaultValue={String(value ?? field.options[0]?.value ?? "")} className={inputClass}>
          {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <input name={field.name} required={field.required !== false} type={field.type ?? "text"} inputMode={field.inputMode} placeholder={field.placeholder} defaultValue={String(value ?? "")} className={inputClass} />
      )}
    </label>
  );
}
