import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { OrderGroupTab } from "@/components/admin/order-group-tab";
import { OrderStatusFilter } from "@/components/admin/order-status-filter";
import { OrderDeleteButton } from "@/components/admin/order-delete-button";
import { ORDER_STATUS_KINDS, ORDER_STATUS_LABELS } from "@/lib/admin/order-labels";
import { formatMoney } from "@/lib/formatting/money";

const PAGE_SIZE = 25;
const ACTIVE_STATUSES = ["pending", "in_production"];
type Search = { q?: string; status?: string; page?: string; group?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = safeSearch(params.q ?? "");
  const status = ACTIVE_STATUSES.includes(params.status ?? "") ? params.status! : "";
  const group = ["active", "completed", "cancelled"].includes(params.group ?? "") ? params.group! : "active";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const supabase = await createServerSupabase();
  // A rejected payment proof is handled from the payment-proofs page, not as an order to fulfill.
  // Apply this to every group and filter so rejected orders never reappear through search/archive.
  let query = supabase.from("orders").select("id, reference, customer_name, customer_phone, order_status, payable_deposit, payable_remaining, payment_currency, created_at").neq("payment_status", "proof_rejected").order("created_at", { ascending: false });
  if (q) query = query.or(`reference.ilike.%${q}%,legacy_reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
  if (status) {
    query = query.eq("order_status", status);
  }
  else if (group === "completed" || group === "cancelled") query = query.eq("order_status", group);
  else query = query.in("order_status", ACTIVE_STATUSES);
  const from = (page - 1) * PAGE_SIZE;
  const { data, error } = await query.range(from, from + PAGE_SIZE);
  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const orders = (data ?? []).slice(0, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="التشغيل" title="الطلبات" />
      <nav aria-label="مجموعات الطلبات" className="flex gap-2 overflow-x-auto border-b border-border pb-2">
        <OrderGroupTab current={group} value="active" label="الطلبات النشطة" params={{ q }} />
        <OrderGroupTab current={group} value="completed" label="مكتملة" params={{ q }} />
        <OrderGroupTab current={group} value="cancelled" label="ملغاة" params={{ q }} />
      </nav>
      <form action="/admin/orders" className="space-y-3 rounded-2xl border border-border bg-surface p-3 shadow-sm sm:p-4">
        <input type="hidden" name="group" value={group} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto_15rem]">
          <label className="col-start-1 min-w-0">
            <span className="sr-only">ابحث عن طلب</span>
            <input name="q" defaultValue={q} placeholder="رقم الطلب، اسم العميل، أو الهاتف" className="min-h-10 w-full rounded-lg border border-border bg-white px-3 text-sm" />
          </label>
          <button className="col-start-2 row-start-1 min-h-10 shrink-0 rounded-lg bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover">بحث</button>
          <label className="col-span-2 col-start-1 row-start-2 min-w-0 sm:col-span-1 sm:col-start-3 sm:row-start-1">
            <span className="mb-1 block text-xs font-medium">حالة الطلب</span>
            <OrderStatusFilter value={status} />
          </label>
        </div>
      </form>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">تعذر تحميل الطلبات. حدّث الصفحة، وإذا استمرت المشكلة تواصل مع مسؤول النظام.</div> : null}
      {!error && orders.length === 0 ? <EmptyState title={q || status ? "لا توجد طلبات مطابقة" : group === "completed" ? "لا توجد طلبات مكتملة" : group === "cancelled" ? "لا توجد طلبات ملغاة" : "لا توجد طلبات نشطة"} description={q || status ? "غيّر البحث أو حالة الطلب لعرض طلبات أخرى." : group === "active" ? "الطلبات المكتملة والملغاة تظهر في تبويبيها." : "ستظهر الطلبات هنا عند توفرها."} /> : null}
      {orders.length > 0 ? <>
        <p className="text-sm text-muted">عرض {from + 1}–{from + orders.length} طلب</p>
        <div role="region" aria-label="جدول الطلبات" tabIndex={0} className="max-w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm focus-visible:outline-2 focus-visible:outline-primary"><table className="w-full min-w-[760px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-4 font-medium">رقم الطلب</th><th className="p-4 font-medium">العميل</th><th className="p-4 font-medium">حالة الطلب</th><th className="p-4 font-medium">العربون</th><th className="p-4 font-medium">المتبقي</th><th className="p-4 font-medium">تاريخ الإنشاء</th><th className="p-4"><span className="sr-only">الإجراء</span></th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id} className="border-t border-border odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-teal-50/70"><td className="whitespace-nowrap p-3 sm:p-4"><Link className="font-semibold text-primary hover:underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link></td><td className="p-3 sm:p-4"><p className="whitespace-nowrap">{order.customer_name}</p><p dir="ltr" className="mt-1 whitespace-nowrap text-xs text-muted">{order.customer_phone}</p></td><td className="whitespace-nowrap p-3 sm:p-4"><StatusBadge value={ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة"} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /></td><td className="whitespace-nowrap p-3 font-medium sm:p-4">{formatMoney(Number(order.payable_deposit), order.payment_currency)}</td><td className="whitespace-nowrap p-3 font-medium sm:p-4">{formatMoney(Number(order.payable_remaining), order.payment_currency)}</td><td className="whitespace-nowrap p-3 text-xs text-muted sm:p-4">{new Date(order.created_at).toLocaleDateString("ar-YE-u-nu-latn")}</td><td className="whitespace-nowrap p-3 sm:p-4"><div className="flex items-center gap-3"><Link className="font-semibold text-primary hover:underline" href={`/admin/orders/${order.id}`}>فتح الطلب</Link>{order.order_status === "completed" || order.order_status === "cancelled" ? <OrderDeleteButton orderId={order.id} orderReference={order.reference} /> : null}</div></td></tr>)}</tbody>
        </table></div>
        <Pagination page={page} hasMore={hasMore} params={{ q, status, group }} />
      </> : null}
    </div>
  );
}

function Pagination({ page, hasMore, params }: { page: number; hasMore: boolean; params: Record<string, string> }) {
  if (page <= 1 && !hasMore) return null;
  const href = (target: number) => `/admin/orders?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, value]) => value)), page: String(target) })}`;
  return <nav aria-label="صفحات الطلبات" className="flex items-center justify-between border-t border-border pt-4 text-sm"><span className="text-muted">صفحة {page.toLocaleString("ar-YE-u-nu-latn")}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} className={`rounded-lg border border-border px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`} href={href(Math.max(1, page - 1))}>السابقة</Link><Link aria-disabled={!hasMore} className={`rounded-lg border border-border px-3 py-2 ${!hasMore ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`} href={href(page + 1)}>التالية</Link></div></nav>;
}
function safeSearch(value: string) { return value.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 80); }
