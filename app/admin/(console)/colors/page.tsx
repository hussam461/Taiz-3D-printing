import { SimpleCrud } from "@/components/admin/simple-crud";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("colors").select("*").order("sort_order");
  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold">الألوان</h1>
      <SimpleCrud
        polished
        table="colors"
        rows={data ?? []}
        fields={[
          { name: "name", label: "اسم اللون", placeholder: "مثال: أزرق سماوي" },
          { name: "hex_code", label: "درجة اللون", type: "color" },
          { name: "is_default", label: "الخيار الافتراضي", type: "checkbox" },
          { name: "is_active", label: "نشط", type: "checkbox" },
        ]}
      />
    </div>
  );
}
