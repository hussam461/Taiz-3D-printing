import { SimpleCrud } from "@/components/admin/simple-crud";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("delivery_areas").select("*").order("sort_order");
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">مناطق التوصيل</h1>
      <SimpleCrud
        polished
        table="delivery_areas"
        rows={data ?? []}
        fields={[
          { name: "governorate", label: "المحافظة" },
          { name: "fee_old_yer", label: "رسوم التوصيل", type: "text", inputMode: "text", required: false, placeholder: "اتركه فارغًا للتوصيل المجاني" },
          { name: "is_default", label: "منطقة التوصيل الافتراضية", type: "checkbox" },
          { name: "is_active", label: "متاحة", type: "checkbox" },
        ]}
      />
    </div>
  );
}
