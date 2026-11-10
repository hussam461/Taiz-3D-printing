import { SimpleCrud } from "@/components/admin/simple-crud";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("payment_accounts").select("*").order("sort_order");
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold">حسابات الدفع اليمنية</h1>
      <p className="mb-4 text-sm text-muted">ترتيب الحسابات في إتمام الطلب يُحدّث تلقائيًا بحسب الإضافة.</p>
      <p className="mb-4 text-sm text-muted">لا يمكن حذف الحساب الأخير أو إفراغ الحسابات النشطة.</p>
      <SimpleCrud
        polished
        table="payment_accounts"
        rows={data ?? []}
        fields={[
          { name: "name", label: "الاسم" },
          { name: "account_number", label: "رقم الحساب" },
          {
            name: "currency_code",
            label: "العملة",
            options: [
              { value: "OLD_YER", label: "ريال قديم" },
              { value: "NEW_YER", label: "ريال جديد" },
            ],
          },
          { name: "instructions", label: "تعليمات" },
          { name: "is_active", label: "ظاهر في إتمام الطلب", type: "checkbox" },
        ]}
      />
    </div>
  );
}
