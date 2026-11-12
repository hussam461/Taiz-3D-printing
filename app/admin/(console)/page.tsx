import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { ORDER_STATUS_KINDS, ORDER_STATUS_LABELS } from "@/lib/admin/order-labels";

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const [proofs, production, completed, recent] = await Promise.all([
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "in_production"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "completed"),
    supabase.from("orders").select("id, reference, customer_name, order_status, created_at").in("order_status", ["pending", "in_production"]).neq("payment_status", "proof_rejected").order("created_at", { ascending: false }).limit(8),
  ]);
  const cards = [
    ["إثباتات تحتاج مراجعة", proofs.count ?? 0, "افتح الإثبات واقبله أو ارفضه", "text-warning", "/admin/payment-proofs?status=pending"],
    ["طلبات قيد التجهيز", production.count ?? 0, "تابع الطلبات التي يجري تجهيزها", "text-info", "/admin/orders?status=in_production&group=active"],
    ["طلبات مكتملة", completed.count ?? 0, "تم تسليمها للعميل", "text-success", "/admin/orders?group=completed"],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader eyebrow="مركز التشغيل" title="ما يحتاج متابعة" />
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {cards.map(([label, value, hint, color, href]) => <Link href={href} key={label} className="flex min-w-0 flex-col rounded-xl border border-border bg-surface p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:rounded-2xl sm:p-5"><p className="min-h-10 text-[11px] font-medium leading-4 text-muted sm:min-h-0 sm:text-sm">{label}</p><p className={`mt-2 text-xl font-semibold sm:mt-3 sm:text-3xl ${color}`}>{value.toLocaleString("ar-YE-u-nu-latn")}</p><p className="mt-2 hidden text-xs leading-5 text-muted sm:block">{hint}</p><span className="mt-3 inline-flex text-[10px] font-semibold text-primary sm:mt-4 sm:text-xs">فتح القائمة ←</span></Link>)}
      </div>
      <section>
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-semibold">الطلبات النشطة</h2><p className="mt-1 text-sm text-muted">أحدث الطلبات التي ما زالت تحتاج متابعة.</p></div><Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">عرض الطلبات</Link></div>
        {(recent.data ?? []).length === 0 ? <EmptyState title="لا توجد طلبات نشطة" description="ستظهر هنا الطلبات بانتظار إثبات الدفع أو قيد التجهيز. الطلبات المكتملة والملغاة محفوظة في الأرشيف." /> : <div role="region" aria-label="جدول الطلبات النشطة" tabIndex={0} className="max-w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-primary"><table className="w-full min-w-[620px] text-right text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-4 font-medium">رقم الطلب</th><th className="p-4 font-medium">العميل</th><th className="p-4 font-medium">حالة الطلب</th><th className="p-4 font-medium">التاريخ</th></tr></thead><tbody>{(recent.data ?? []).map((order) => <tr key={order.id} className="border-t border-border odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-teal-50/70"><td className="p-4"><Link className="font-medium text-primary hover:underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link></td><td className="p-4">{order.customer_name}</td><td className="p-4"><StatusBadge value={ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة"} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /></td><td className="p-4 text-xs text-muted">{new Date(order.created_at).toLocaleDateString("ar-YE-u-nu-latn")}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
