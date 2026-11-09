import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, StatusBadge, EmptyState } from "@/components/admin/ui";
import { OrderGroupTab } from "@/components/admin/order-group-tab";
import { BALANCE_STATUS_LABELS, ORDER_STATUS_KINDS, ORDER_STATUS_LABELS, PAYMENT_STATUS_KINDS, PAYMENT_STATUS_LABELS } from "@/lib/admin/order-labels";
import { formatOldYer } from "@/lib/formatting/money";

const PAGE_SIZE = 25;
const ACTIVE_STATUSES = ["pending", "confirmed", "in_production", "ready", "shipped"];
type Search = { q?: string; status?: string; payment?: string; balance?: string; page?: string; group?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const q = safeSearch(params.q ?? "");
  const status = Object.hasOwn(ORDER_STATUS_LABELS, params.status ?? "") ? params.status! : "";
  const group = status ? ACTIVE_STATUSES.includes(status) ? "active" : "archive" : ["active", "archive", "all"].includes(params.group ?? "") ? params.group! : "active";
  const payment = Object.hasOwn(PAYMENT_STATUS_LABELS, params.payment ?? "") ? params.payment! : "";
  const balance = ["due", "paid", "not_due", "legacy_untracked"].includes(params.balance ?? "") ? params.balance! : "";
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const supabase = await createServerSupabase();
  let query = supabase.from("orders").select("id, reference, customer_name, customer_phone, order_status, payment_status, balance_status, final_total_old_yer, created_at").order("created_at", { ascending: false });
  if (q) query = query.or(`reference.ilike.%${q}%,customer_name.ilike.%${q}%,customer_phone.ilike.%${q}%`);
  if (status) query = query.eq("order_status", status);
  else if (group === "active") query = query.in("order_status", ACTIVE_STATUSES);
  else if (group === "archive") query = query.in("order_status", ["completed", "cancelled"]);
  if (payment) query = query.eq("payment_status", payment);
  if (balance) query = query.eq("balance_status", balance);
  if (balance === "due") query = query.neq("order_status", "cancelled");
  const from = (page - 1) * PAGE_SIZE;
  const { data, error } = await query.range(from, from + PAGE_SIZE);
  const hasMore = (data?.length ?? 0) > PAGE_SIZE;
  const orders = (data ?? []).slice(0, PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="التشغيل" title="الطلبات" description="ابدأ بما يحتاج متابعة، وابحث برقم الطلب أو اسم العميل أو هاتفه." />
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="مراجعة العربون" hint="راجع الإثبات واتخذ القرار" href="/admin/payment-proofs?status=pending" />
        <SummaryCard label="قيد التجهيز" hint="طلبات بدأ تجهيزها بعد اعتماد العربون" href="/admin/orders?status=in_production&group=active" />
        <SummaryCard label="جاهزة للتسليم" hint="سجّل التسليم والمتبقي عند الاستلام" href="/admin/orders?status=ready&group=active" />
      </div>
      <nav aria-label="مجموعات الطلبات" className="flex gap-2 overflow-x-auto border-b border-border pb-2">
        <OrderGroupTab current={group} value="active" label="الطلبات النشطة" params={{ q, payment, balance }} />
        <OrderGroupTab current={group} value="archive" label="الأرشيف: مكتملة وملغاة" params={{ q, payment, balance }} />
        <OrderGroupTab current={group} value="all" label="كل الطلبات" params={{ q, payment, balance }} />
      </nav>
      <form action="/admin/orders" className="space-y-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <input type="hidden" name="group" value={group} />
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex-1 space-y-1 text-sm"><span className="font-medium">ابحث عن طلب</span><input name="q" defaultValue={q} placeholder="رقم الطلب، اسم العميل، أو الهاتف" className="min-h-11 w-full rounded-lg border border-border bg-white px-3" /></label>
          <button className="min-h-11 self-end rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-hover">بحث</button>
          <Link href="/admin/orders" className="inline-flex min-h-11 items-center justify-center self-end rounded-lg border border-border px-4 font-medium hover:bg-slate-50">مسح</Link>
        </div>
        <details open={Boolean(status || payment || balance)} className="rounded-xl border border-border bg-slate-50/70 p-3">
          <summary className="cursor-pointer text-sm font-semibold">تصفية متقدمة</summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm"><span className="font-medium">حالة الطلب</span><select name="status" defaultValue={status} className="min-h-11 w-full rounded-lg border border-border bg-white px-3"><option value="">كل الحالات</option>{Object.entries(ORDER_STATUS_LABELS).filter(([key]) => key !== "shipped").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span className="font-medium">حالة العربون</span><select name="payment" defaultValue={payment} className="min-h-11 w-full rounded-lg border border-border bg-white px-3"><option value="">كل حالات الدفع</option>{Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <label className="space-y-1 text-sm"><span className="font-medium">المبلغ المتبقي</span><select name="balance" defaultValue={balance} className="min-h-11 w-full rounded-lg border border-border bg-white px-3"><option value="">كل الحالات</option>{Object.entries(BALANCE_STATUS_LABELS).filter(([key]) => key !== "cancelled_due").map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            <button className="min-h-11 self-end rounded-lg border border-border bg-white px-5 font-semibold hover:bg-slate-100">تطبيق التصفية</button>
          </div>
        </details>
      </form>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">تعذر تحميل الطلبات. حدّث الصفحة، وإذا استمرت المشكلة تواصل مع مسؤول النظام.</div> : null}
      {!error && orders.length === 0 ? <EmptyState title={q || status || payment || balance ? "لا توجد طلبات مطابقة" : group === "archive" ? "الأرشيف فارغ" : group === "active" ? "لا توجد طلبات تحتاج إلى متابعة" : "لا توجد طلبات حتى الآن"} description={q || status || payment || balance ? "غيّر البحث أو عوامل التصفية لعرض طلبات أخرى." : group === "active" ? "الطلبات المكتملة والملغاة محفوظة في الأرشيف." : "ستظهر الطلبات هنا بعد إتمام العملاء للشراء من المتجر."} /> : null}
      {orders.length > 0 ? <>
        <p className="text-sm text-muted">عرض {from + 1}–{from + orders.length} طلب</p>
        <div className="hidden overflow-x-auto rounded-2xl border border-border bg-surface shadow-sm md:block"><table className="w-full min-w-[900px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-4 font-medium">الطلب</th><th className="p-4 font-medium">العميل</th><th className="p-4 font-medium">حالة الطلب</th><th className="p-4 font-medium">حالة العربون</th><th className="p-4 font-medium">المتبقي</th><th className="p-4 font-medium">الإجمالي</th><th className="p-4 font-medium">تاريخ الإنشاء</th><th className="p-4"><span className="sr-only">الإجراء</span></th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id} className="border-t border-border transition hover:bg-slate-50/70"><td className="p-4"><Link className="font-semibold text-primary hover:underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link></td><td className="p-4"><p>{order.customer_name}</p><p dir="ltr" className="mt-1 text-xs text-muted">{order.customer_phone}</p></td><td className="p-4"><StatusBadge value={ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة"} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /></td><td className="p-4"><StatusBadge value={PAYMENT_STATUS_LABELS[order.payment_status] ?? "حالة دفع غير معروفة"} kind={PAYMENT_STATUS_KINDS[order.payment_status] ?? "neutral"} /></td><td className="p-4"><StatusBadge value={balanceLabel(order)} kind={balanceKind(order)} /></td><td className="whitespace-nowrap p-4 font-medium">{formatOldYer(Number(order.final_total_old_yer))}</td><td className="whitespace-nowrap p-4 text-xs text-muted">{new Date(order.created_at).toLocaleDateString("ar-YE-u-nu-latn")}</td><td className="p-4"><Link className="font-semibold text-primary hover:underline" href={`/admin/orders/${order.id}`}>فتح الطلب</Link></td></tr>)}</tbody>
        </table></div>
        <ul className="space-y-3 md:hidden">{orders.map((order) => <li key={order.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted">رقم الطلب</p><Link className="mt-1 inline-block font-bold text-primary" href={`/admin/orders/${order.id}`}>{order.reference}</Link></div><span className="text-xs text-muted">{new Date(order.created_at).toLocaleDateString("ar-YE-u-nu-latn")}</span></div><p className="mt-3 font-medium">{order.customer_name}</p><p dir="ltr" className="mt-1 text-start text-xs text-muted">{order.customer_phone}</p><div className="mt-3 flex flex-wrap gap-2"><StatusBadge value={ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة"} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /><StatusBadge value={PAYMENT_STATUS_LABELS[order.payment_status] ?? "حالة دفع غير معروفة"} kind={PAYMENT_STATUS_KINDS[order.payment_status] ?? "neutral"} /><StatusBadge value={balanceLabel(order)} kind={balanceKind(order)} /></div><div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="font-semibold">{formatOldYer(Number(order.final_total_old_yer))}</span><Link className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white" href={`/admin/orders/${order.id}`}>فتح الطلب</Link></div></li>)}</ul>
        <Pagination page={page} hasMore={hasMore} params={{ q, status, payment, balance, group }} />
      </> : null}
    </div>
  );
}

function SummaryCard({ label, hint, href }: { label: string; hint: string; href: string }) { return <Link href={href} className="rounded-xl border border-border bg-surface p-4 transition hover:border-primary/40 hover:shadow-sm"><p className="font-semibold">{label}</p><p className="mt-1 text-sm text-muted">{hint}</p></Link>; }
function Pagination({ page, hasMore, params }: { page: number; hasMore: boolean; params: Record<string, string> }) {
  if (page <= 1 && !hasMore) return null;
  const href = (target: number) => `/admin/orders?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, value]) => value)), page: String(target) })}`;
  return <nav aria-label="صفحات الطلبات" className="flex items-center justify-between border-t border-border pt-4 text-sm"><span className="text-muted">صفحة {page.toLocaleString("ar-YE-u-nu-latn")}</span><div className="flex gap-2"><Link aria-disabled={page <= 1} className={`rounded-lg border border-border px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`} href={href(Math.max(1, page - 1))}>السابقة</Link><Link aria-disabled={!hasMore} className={`rounded-lg border border-border px-3 py-2 ${!hasMore ? "pointer-events-none opacity-50" : "hover:bg-slate-50"}`} href={href(page + 1)}>التالية</Link></div></nav>;
}
function safeSearch(value: string) { return value.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 80); }
function balanceLabel(order: { balance_status: string; order_status: string }) { if (order.balance_status === "due" && order.order_status === "cancelled") return BALANCE_STATUS_LABELS.cancelled_due; return BALANCE_STATUS_LABELS[order.balance_status] ?? "حالة غير معروفة"; }
function balanceKind(order: { balance_status: string; order_status: string }): "success" | "warning" | "neutral" { if (order.balance_status === "paid") return "success"; if (order.balance_status === "due" && order.order_status !== "cancelled") return "warning"; return "neutral"; }
