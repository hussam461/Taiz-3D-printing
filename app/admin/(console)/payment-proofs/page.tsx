import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader, EmptyState, StatusBadge } from "@/components/admin/ui";
import { PAYMENT_PROOF_STATUS_LABELS } from "@/lib/admin/order-labels";
import { formatMoney } from "@/lib/formatting/money";
import type { PaymentCurrency } from "@/types/domain";
import { whatsappNumber } from "@/lib/formatting/whatsapp";

const PAGE_SIZE = 20;
type Search = { status?: string; q?: string; page?: string };

export default async function ProofsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const status = ["pending", "approved", "rejected", "all"].includes(params.status ?? "") ? params.status! : "pending";
  const q = (params.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const supabase = await createServerSupabase();
  let orderIds: string[] | null = null;
  if (q) {
    const { data: matches } = await supabase.from("orders").select("id").ilike("reference", `%${q}%`).limit(100);
    orderIds = (matches ?? []).map((row) => row.id);
  }
  let query = supabase.from("payment_proofs").select("id, status, created_at, mime_type, rejection_reason, order_id, orders(id, reference, order_status, customer_name, customer_phone, deposit_old_yer, payment_currency)", { count: "exact" }).order("created_at", { ascending: false });
  if (status !== "all") query = query.eq("status", status);
  if (orderIds) query = orderIds.length ? query.in("order_id", orderIds) : query.eq("order_id", "00000000-0000-0000-0000-000000000000");
  const [{ data, error, count }, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    query.range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);
  const proofs = data ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const tabs = [{ key: "pending", label: "بانتظار المراجعة", count: pendingCount.count ?? 0 }, { key: "approved", label: "المعتمدة", count: approvedCount.count ?? 0 }, { key: "rejected", label: "المرفوضة", count: rejectedCount.count ?? 0 }, { key: "all", label: "الكل", count: (pendingCount.count ?? 0) + (approvedCount.count ?? 0) + (rejectedCount.count ?? 0) }];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="التشغيل" title="مراجعة العربون" description="راجع مبلغ العربون وصورة الإثبات. اعتماد الإثبات يبدأ تجهيز الطلب تلقائيًا." />
      <div className="grid gap-3 sm:grid-cols-3"><Summary label="بانتظار المراجعة" value={pendingCount.count ?? 0} /><Summary label="تم اعتمادها" value={approvedCount.count ?? 0} /><Summary label="تم رفضها" value={rejectedCount.count ?? 0} /></div>
      <form action="/admin/payment-proofs" className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-end"><input type="hidden" name="status" value={status} /><label className="flex-1 space-y-1 text-sm"><span className="font-medium">بحث برقم الطلب</span><input name="q" defaultValue={q} placeholder="مثال: TP-2026..." className="min-h-11 w-full rounded-lg border border-border bg-white px-3" /></label><button className="min-h-11 rounded-lg bg-primary px-5 font-semibold text-white hover:bg-primary-hover">بحث</button>{q ? <Link href={`/admin/payment-proofs?status=${status}`} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 font-medium">مسح البحث</Link> : null}</form>
      <nav aria-label="تصفية الإثباتات" className="flex gap-2 overflow-x-auto border-b border-border pb-2">{tabs.map((tab) => <Link key={tab.key} href={`/admin/payment-proofs?${new URLSearchParams({ status: tab.key, ...(q ? { q } : {}) })}`} aria-current={status === tab.key ? "page" : undefined} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${status === tab.key ? "bg-primary text-white" : "bg-slate-100 text-text hover:bg-slate-200"}`}>{tab.label} <span className="ms-1 opacity-75">{tab.count.toLocaleString("ar-YE-u-nu-latn")}</span></Link>)}</nav>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">تعذر تحميل إثباتات الدفع. حدّث الصفحة، وإذا استمرت المشكلة تواصل مع مسؤول النظام.</div> : null}
      {!error && proofs.length === 0 ? <EmptyState title={q ? "لا توجد إثباتات مطابقة" : status === "pending" ? "لا توجد إثباتات تنتظر المراجعة" : "لا توجد إثباتات في هذه القائمة"} description={q ? "تحقق من رقم الطلب أو اختر حالة أخرى." : status === "pending" ? "أصبحت مراجعات الدفع الحالية منجزة." : "ستظهر هنا الإثباتات بحسب الحالة المحددة."} /> : null}
      {proofs.length > 0 ? <>
        <p className="text-sm text-muted">عرض {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} من {total.toLocaleString("ar-YE-u-nu-latn")} إثبات</p>
        <div className="space-y-4">{proofs.map((proof) => {
          const order = Array.isArray(proof.orders) ? proof.orders[0] : proof.orders;
          const kind = proof.status === "approved" ? "success" : proof.status === "rejected" ? "danger" : "warning";
          const rejectionReason = String(proof.rejection_reason ?? "").trim();
          const customerPhone = order?.customer_phone ? whatsappNumber(String(order.customer_phone)) : "";
          const message = order ? `السلام عليكم ${order.customer_name}، بخصوص طلبك ${order.reference}: تعذر اعتماد إثبات الدفع. ${rejectionReason ? `السبب: ${rejectionReason} ` : ""}يرجى إعادة إرسال الإثبات عبر واتساب حتى نتمكن من متابعة طلبك.` : "";
          const contactHref = customerPhone ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}` : null;
          return <article key={proof.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs text-muted">رقم الطلب</p><p className="mt-1 font-semibold">{order ? <Link className="text-primary hover:underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link> : "الطلب غير متاح"}</p>{order ? <p className="mt-1 text-sm text-muted">{order.customer_name} · العربون: {formatMoney(Number(order.deposit_old_yer), order.payment_currency as PaymentCurrency)}</p> : null}</div><StatusBadge value={PAYMENT_PROOF_STATUS_LABELS[proof.status] ?? "حالة غير معروفة"} kind={kind} /></div><p className="mt-2 text-sm text-muted">رُفع في {new Date(proof.created_at).toLocaleString("ar-YE-u-nu-latn")}</p>{proof.status === "rejected" && order ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"><p className="font-semibold">الطلب ما زال نشطًا؛ رفض الإثبات لا يلغي الطلب تلقائيًا.</p>{rejectionReason ? <p className="mt-1"><span className="font-semibold">السبب:</span> {rejectionReason}</p> : null}<p className="mt-1">أرسل سبب الرفض للعميل عبر واتساب واطلب منه إعادة إرسال الإثبات هناك.</p><div className="mt-2 flex flex-wrap gap-2">{contactHref ? <a href={contactHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">إرسال رسالة واتساب</a> : <span className="text-sm text-muted">رقم العميل غير متاح لفتح واتساب.</span>}<Link href={`/admin/orders/${order.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-white">فتح الطلب</Link></div></div> : null}{order ? <div className="mt-4 border-t border-border pt-4"><OrderActions orderId={order.id} status={order.order_status} proofs={[{ id: proof.id, status: proof.status, createdAt: proof.created_at, mimeType: proof.mime_type }]} allowStatusUpdate={false} /></div> : null}</article>;
        })}</div>
        {pages > 1 ? <nav aria-label="صفحات الإثباتات" className="flex items-center justify-between border-t border-border pt-4 text-sm"><span className="text-muted">صفحة {page} من {pages}</span><div className="flex gap-2"><Link className={`rounded-lg border border-border px-3 py-2 ${page <= 1 ? "pointer-events-none opacity-50" : ""}`} href={proofPageHref(status, q, Math.max(1, page - 1))}>السابقة</Link><Link className={`rounded-lg border border-border px-3 py-2 ${page >= pages ? "pointer-events-none opacity-50" : ""}`} href={proofPageHref(status, q, Math.min(pages, page + 1))}>التالية</Link></div></nav> : null}
      </> : null}
    </div>
  );
}

function proofPageHref(status: string, q: string, page: number) { return `/admin/payment-proofs?${new URLSearchParams({ status, ...(q ? { q } : {}), page: String(page) })}`; }
function Summary({ label, value }: { label: string; value: number }) { return <section className="rounded-xl border border-border bg-surface p-4"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value.toLocaleString("ar-YE-u-nu-latn")}</p></section>; }
