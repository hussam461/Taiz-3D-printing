import { SimpleCrud } from "@/components/admin/simple-crud";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("materials").select("*").order("sort_order");
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">الخامات</h1>
      <SimpleCrud
        polished
        table="materials"
        rows={data ?? []}
        fields={[
          { name: "name", label: "الاسم" },
          { name: "is_default", label: "الخامة الافتراضية", type: "checkbox" },
          { name: "is_active", label: "نشط", type: "checkbox" },
        ]}
      />
    </div>
  );
}
