import { SimpleCrud } from "@/components/admin/simple-crud";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("faq_items").select("*").order("sort_order");
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">الأسئلة الشائعة</h1>
      <p className="mb-4 text-sm text-muted">ترتيب الأسئلة يُحدّث تلقائيًا حسب الإضافة، ولا يحتاج إلى إدخال يدوي.</p>
      <SimpleCrud
        polished
        table="faq_items"
        rows={data ?? []}
        fields={[
          { name: "question", label: "السؤال" },
          { name: "answer", label: "الإجابة" },
          { name: "is_published", label: "منشور", type: "checkbox" },
        ]}
      />
    </div>
  );
}
