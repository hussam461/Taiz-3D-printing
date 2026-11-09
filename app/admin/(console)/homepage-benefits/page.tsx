import { SimpleCrud } from "@/components/admin/simple-crud";
import { PageHeader } from "@/components/admin/ui";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("homepage_benefits").select("*").order("sort_order");
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow="المحتوى" title="مزايا المتجر الرئيسية" description="تحكم في البطاقات التي تشرح للعملاء ما يميز المتجر. لا يظهر للعميل إلا العنصر المنشور." />
      <SimpleCrud
        table="homepage_benefits"
        rows={data ?? []}
        fields={[
          { name: "title", label: "العنوان", placeholder: "مثال: طباعة دقيقة" },
          { name: "description", label: "الوصف", type: "textarea", placeholder: "اكتب فائدة واضحة ومختصرة للعميل." },
          { name: "is_published", label: "منشور للعميل", type: "checkbox" },
        ]}
      />
    </div>
  );
}
