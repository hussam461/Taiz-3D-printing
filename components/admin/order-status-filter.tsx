"use client";

export function OrderStatusFilter({ value }: { value: string }) {
  return (
    <select
      name="status"
      defaultValue={value}
      onChange={(event) => event.currentTarget.form?.requestSubmit()}
      className="min-h-10 w-full rounded-lg border border-border bg-white px-2 text-sm"
    >
      <option value="">كل الحالات</option>
      <option value="pending">بانتظار إثبات الدفع</option>
      <option value="in_production">قيد التجهيز</option>
    </select>
  );
}
