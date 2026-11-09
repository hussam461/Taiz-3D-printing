import { saveExchangeRate } from "@/lib/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data: rates } = await supabase
    .from("exchange_rates")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  const current = rates?.[0];
  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold">العملات وسعر التحويل</h1>
      <p className="text-sm text-muted">
        أدخل عدد الريالات الجديدة التي تساوي ريالًا قديمًا واحدًا. مثال: 3 تعني أن 1 ريال قديم = 3 ريالات جديدة.
        التغيير يؤثر على الطلبات الجديدة فقط.
      </p>
      <p className="text-sm">السعر الحالي: {current ? `1 ريال قديم = ${current.new_rial_per_old_rial} ريال جديد` : "غير معيّن"}</p>
      <ActionForm
        action={async (formData) => {
          "use server";
          return await saveExchangeRate(formData);
        }}
        className="space-y-3 rounded-xl border border-border bg-surface p-4"
      >
        <input
          name="new_rial_per_old_rial"
          type="number"
          min={0.000001}
          step="0.000001"
          required
          aria-label="عدد الريالات الجديدة لكل ريال قديم واحد"
          placeholder="مثال: 3"
          className="w-full rounded-md border border-border px-3 py-2"
        />
        <SubmitButton pendingLabel="جارٍ الحفظ..." className="rounded-md bg-primary px-4 py-2 text-white">حفظ سعر جديد</SubmitButton>
      </ActionForm>
    </div>
  );
}
