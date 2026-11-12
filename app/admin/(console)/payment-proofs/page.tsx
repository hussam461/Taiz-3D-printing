import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase/server";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader, EmptyState } from "@/components/admin/ui";
import { formatMoney } from "@/lib/formatting/money";
import type { PaymentCurrency } from "@/types/domain";
import { whatsappNumber } from "@/lib/formatting/whatsapp";
import { PaymentProofDelete } from "@/components/admin/payment-proof-delete";
import { PaymentProofSelectCheckbox } from "@/components/admin/payment-proof-selection";
import { PaymentProofBatches } from "@/components/admin/payment-proof-batches";
import { LoadMorePaymentProofs } from "@/components/admin/load-more-payment-proofs";
import { PaymentProofSearch } from "@/components/admin/payment-proof-search";

const PAGE_SIZE = 20;
type Search = { status?: string; q?: string; page?: string };

export default async function ProofsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const status = ["pending", "approved", "rejected"].includes(params.status ?? "") ? params.status! : "pending";
  const q = (params.q ?? "").replace(/[^\p{L}\p{N}\s-]/gu, "").trim().slice(0, 80);
  const requestedPage = Number.parseInt(params.page ?? "1", 10) || 1;
  const page = Math.min(1_000_000, Math.max(1, requestedPage));
  const supabase = await createServerSupabase();
  let orderIds: string[] | null = null;
  if (q) {
    const { data: matches } = await supabase.from("orders").select("id").or(`reference.ilike.%${q}%,customer_name.ilike.%${q}%`).limit(100);
    orderIds = (matches ?? []).map((row) => row.id);
  }
  let query = supabase.from("payment_proofs").select("id, status, created_at, mime_type, rejection_reason, order_id, orders(id, reference, order_status, customer_name, customer_phone, deposit_old_yer, payment_currency)", { count: "exact" }).order("created_at", { ascending: false });
  query = query.eq("status", status);
  if (orderIds) query = orderIds.length ? query.in("order_id", orderIds) : query.eq("order_id", "00000000-0000-0000-0000-000000000000");
  const [{ data, error, count }, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    query.range(0, page * PAGE_SIZE - 1),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("payment_proofs").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);
  const proofs = data ?? [];
  const total = count ?? 0;
  const shown = Math.min(page * PAGE_SIZE, total);
  const tabs = [{ key: "pending", label: "بانتظار المراجعة", count: pendingCount.count ?? 0 }, { key: "approved", label: "المعتمدة", count: approvedCount.count ?? 0 }, { key: "rejected", label: "المرفوضة", count: rejectedCount.count ?? 0 }];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="التشغيل" title="مراجعة العربون" />
      <PaymentProofSearch status={status} initialQuery={q} />
      <nav aria-label="تصفية الإثباتات" className="flex gap-2 overflow-x-auto border-b border-border pb-2">{tabs.map((tab) => <Link key={tab.key} href={`/admin/payment-proofs?${new URLSearchParams({ status: tab.key, ...(q ? { q } : {}) })}`} aria-current={status === tab.key ? "page" : undefined} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold transition ${status === tab.key ? "bg-primary text-white" : "bg-slate-100 text-text hover:bg-slate-200"}`}>{tab.label} <span className="ms-1 opacity-75">{tab.count.toLocaleString("ar-YE-u-nu-latn")}</span></Link>)}</nav>
      {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">تعذر تحميل إثباتات الدفع. حدّث الصفحة، وإذا استمرت المشكلة تواصل مع مسؤول النظام.</div> : null}
      {!error && proofs.length === 0 ? <EmptyState title={q ? "لا توجد إثباتات مطابقة" : status === "pending" ? "لا توجد إثباتات تنتظر المراجعة" : "لا توجد إثباتات في هذه القائمة"} description={q ? "تحقق من رقم الطلب أو اختر حالة أخرى." : status === "pending" ? "أصبحت مراجعات الدفع الحالية منجزة." : "ستظهر هنا الإثباتات بحسب الحالة المحددة."} /> : null}
      {proofs.length > 0 ? <>
        <p className="text-sm text-muted">عرض 1–{shown.toLocaleString("ar-YE-u-nu-latn")} من {total.toLocaleString("ar-YE-u-nu-latn")} إثبات</p>
        <PaymentProofBatches listKey={`${status}:${q}`} batchNumber={page} selectableIds={proofs.filter((proof) => proof.status !== "pending").map((proof) => proof.id)}>
        {proofs.map((proof) => {
          const order = Array.isArray(proof.orders) ? proof.orders[0] : proof.orders;
          const rejectionReason = String(proof.rejection_reason ?? "").trim();
          const customerPhone = order?.customer_phone ? whatsappNumber(String(order.customer_phone)) : "";
          const approvedMessage = order ? `السلام عليكم ${order.customer_name}، تم اعتماد إثبات العربون لطلبك ${order.reference} بنجاح، وبدأنا تجهيز الطلب. شكرًا لثقتك بنا.` : "";
          const rejectedMessage = order ? `السلام عليكم ${order.customer_name}، بخصوص طلبك ${order.reference}: تعذر اعتماد إثبات الدفع. ${rejectionReason ? `السبب: ${rejectionReason} ` : ""}يرجى إعادة إرسال الإثبات عبر واتساب حتى نتمكن من متابعة طلبك.` : "";
          const message = proof.status === "approved" ? approvedMessage : rejectedMessage;
          const contactHref = customerPhone && message ? `https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}` : null;
          return <article key={proof.id} data-proof-id={proof.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">رقم الطلب</p>
                <p className="mt-1 font-semibold">{order ? <Link className="text-primary hover:underline" href={`/admin/orders/${order.id}`}>{order.reference}</Link> : "الطلب غير متاح"}</p>
                {order ? <p className="mt-1 text-sm text-muted">{order.customer_name} · العربون: {formatMoney(Number(order.deposit_old_yer), order.payment_currency as PaymentCurrency)}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-xs text-muted">رُفع في {new Date(proof.created_at).toLocaleString("ar-YE-u-nu-latn")}</p>
                  {order ? <OrderActions orderId={order.id} status={order.order_status} customer={{ name: String(order.customer_name), phone: String(order.customer_phone), reference: String(order.reference) }} proofs={[{ id: proof.id, status: proof.status, createdAt: proof.created_at, mimeType: proof.mime_type }]} allowStatusUpdate={false} /> : null}
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {proof.status !== "pending" ? <PaymentProofSelectCheckbox proofId={proof.id} /> : null}
                {proof.status !== "pending" ? <PaymentProofDelete proofId={proof.id} /> : null}
              </div>
            </div>
            {proof.status !== "pending" && order ? <div className={`mt-3 rounded-xl p-3 text-sm leading-6 ${proof.status === "approved" ? "border border-green-200 bg-green-50 text-green-950" : "border border-amber-200 bg-amber-50 text-amber-950"}`}>
              {proof.status === "rejected" && rejectionReason ? <p className="mt-1"><span className="font-semibold">سبب الرفض:</span> {rejectionReason}</p> : null}
              <div className="mt-2 flex flex-wrap gap-2">{contactHref ? <a href={contactHref} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">إرسال رسالة عبر واتساب</a> : <span className="text-sm text-muted">رقم العميل غير متاح لفتح واتساب.</span>}<Link href={`/admin/orders/${order.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-white">فتح الطلب</Link></div>
            </div> : null}
          </article>;
        })}
        </PaymentProofBatches>
        {shown < total ? <LoadMorePaymentProofs href={proofPageHref(status, q, page + 1)} /> : <p className="border-t border-border pt-4 text-center text-sm text-muted">لا توجد إثباتات أخرى لعرضها</p>}
      </> : null}
    </div>
  );
}

function proofPageHref(status: string, q: string, page: number) { return `/admin/payment-proofs?${new URLSearchParams({ status, ...(q ? { q } : {}), page: String(page) })}`; }
