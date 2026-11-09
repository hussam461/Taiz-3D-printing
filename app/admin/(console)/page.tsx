import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { ORDER_STATUS_KINDS, ORDER_STATUS_LABELS, PAYMENT_STATUS_KINDS, PAYMENT_STATUS_LABELS } from "@/lib/admin/order-labels";

export default async function AdminHome() {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const [proofs, production, ready, recent] = await Promise.all([
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "in_production"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("order_status", "ready"),
    supabase.from("orders").select("id, reference, customer_name, order_status, payment_status, created_at").in("order_status", ["pending", "confirmed", "in_production", "ready", "shipped"]).order("created_at", { ascending: false }).limit(8),
  ]);
  const cards = [
    ["إثباتات تحتاج مراجعة", proofs.count ?? 0, "افتح الإثبات واقبله أو ارفضه", "text-warning", "/admin/payment-proofs?status=pending"],
    ["طلبات قيد التجهيز", production.count ?? 0, "تابع الطلبات التي يجري تجهيزها", "text-info", "/admin/orders?status=in_production&group=active"],
    ["طلبات جاهزة للتسليم", ready.count ?? 0, "سلّم الطلب وسجّل المتبقي عند الاستلام", "text-success", "/admin/orders?status=ready&group=active"],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-7">
      <PageHeader eyebrow="مركز التشغيل" title="ما يحتاج متابعة" description="تظهر هنا الإجراءات المهمة فقط: مراجعة العربون، التجهيز، والتسليم." />
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(([label, value, hint, color, href]) => <Link href={href} key={label} className="rounded-2xl border border-border bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"><p className="text-sm text-muted">{label}</p><p className={`mt-3 text-3xl font-semibold ${color}`}>{value.toLocaleString("ar-YE-u-nu-latn")}</p><p className="mt-2 text-xs text-muted">{hint}</p><span className="mt-4 inline-flex text-xs font-semibold text-primary">فتح القائمة ←</span></Link>)}
      </div>
      <section>
        <div className="mb-4 flex items-end justify-between"><div><h2 className="text-xl font-semibold">الطلبات النشطة</h2><p className="mt-1 text-sm text-muted">أحدث الطلبات التي ما زالت تحتاج متابعة.</p></div><Link href="/admin/orders" className="text-sm font-medium text-primary hover:underline">عرض الطلبات</Link></div>
        {(recent.data ?? []).length === 0 ? <EmptyState title="لا توجد طلبات نشطة" description="ستظهر هنا الطلبات التي ما زالت قيد المراجعة أو التجهيز أو التسليم. الطلبات المكتملة والملغاة محفوظة في الأرشيف." /> : <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm"><table className="w-full min-w-[760px] text-right text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-4 font-medium">المرجع</th><th className="p-4 font-medium">العميل</th><th className="p-4 font-medium">حالة الطلب</th><th className="p-4 font-medium">حالة العربون</th><th className="p-4 font-medium">التاريخ</th></tr></thead><tbody>{(recent.data ?? []).map((order) => <tr key={order.id} className="border-t border-border hover:bg-slate-50/70"><td className="p-4"><Link className="font-medium text-primary hover:underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link></td><td className="p-4">{order.customer_name}</td><td className="p-4"><StatusBadge value={ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة"} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /></td><td className="p-4"><StatusBadge value={PAYMENT_STATUS_LABELS[order.payment_status] ?? "حالة دفع غير معروفة"} kind={PAYMENT_STATUS_KINDS[order.payment_status] ?? "neutral"} /></td><td className="p-4 text-xs text-muted">{new Date(order.created_at).toLocaleDateString("ar-YE-u-nu-latn")}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  );
}
