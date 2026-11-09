import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin/ui";
import { ORDER_STATUS_KINDS, ORDER_STATUS_LABELS, PAYMENT_STATUS_KINDS, PAYMENT_STATUS_LABELS } from "@/lib/admin/order-labels";
import { formatOldYer } from "@/lib/formatting/money";
import { currencyLabel, formatMoney } from "@/lib/formatting/money";
import { whatsappNumber } from "@/lib/formatting/whatsapp";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();
  const [{ data: items }, { data: proofs }, { data: history }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("payment_proofs").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("order_status_history").select("*").eq("order_id", id).order("created_at"),
  ]);
  const orderStatus = ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة";
  const paymentStatus = PAYMENT_STATUS_LABELS[order.payment_status] ?? "حالة دفع غير معروفة";
  const phone = whatsappNumber(String(order.customer_phone));
  const currency = order.payment_currency === "NEW_YER" ? "NEW_YER" : "OLD_YER";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="تفاصيل الطلب" title={order.reference} description={`أُنشئ في ${new Date(order.created_at).toLocaleString("ar-YE-u-nu-latn")}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="بيانات العميل والتوصيل">
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="اسم العميل" value={order.customer_name} />
            <div><dt className="text-xs text-muted">رقم الهاتف</dt><dd className="mt-1 font-medium" dir="ltr">{order.customer_phone}</dd></div>
            <Detail label="المحافظة" value={order.delivery_governorate} />
            <Detail label="المنطقة" value={order.delivery_city_area || "—"} />
            <div className="sm:col-span-2"><Detail label="العنوان" value={order.delivery_address} /></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">تواصل سريع</dt><dd className="mt-2 flex flex-wrap gap-2"><a href={`tel:+${phone}`} dir="ltr" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-3 text-sm font-semibold hover:bg-slate-50">اتصال بالعميل</a><a href={`https://wa.me/${phone}?text=${encodeURIComponent(`السلام عليكم ${order.customer_name}، بخصوص طلبك رقم ${order.reference}.`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700">مراسلة واتساب</a></dd></div>
            <div><dt className="text-xs text-muted">حالة الطلب</dt><dd className="mt-1"><StatusBadge value={orderStatus} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /></dd></div>
            <div><dt className="text-xs text-muted">حالة الدفع</dt><dd className="mt-1"><StatusBadge value={paymentStatus} kind={PAYMENT_STATUS_KINDS[order.payment_status] ?? "neutral"} /></dd></div>
          </dl>
        </SectionCard>
        <SectionCard title="ملخص المبالغ">
          <dl className="space-y-3 text-sm">
            <MoneyRow label="المجموع قبل الخصم" value={order.subtotal_old_yer} />
            <MoneyRow label="الخصم" value={order.discount_total_old_yer} />
            <MoneyRow label="رسوم التوصيل" value={order.delivery_fee_old_yer} />
            <MoneyRow label="الإجمالي" value={order.final_total_old_yer} strong />
            <MoneyRow label={`العربون (${order.deposit_percent}٪)`} value={order.deposit_old_yer} />
            <MoneyRow label="المتبقي بالريال القديم" value={order.remaining_old_yer} />
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-blue-950"><p className="text-xs">المتبقي المستحق عند استلام الطلب</p><p className="mt-1 font-bold">{formatMoney(Number(order.payable_remaining), currency)}</p><p className="mt-1 text-xs text-blue-900/75">يُحصّل عند تسليم الطلب للعميل · {currencyLabel(currency)}</p></div>
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="منتجات الطلب">
        {(items ?? []).length === 0 ? <p className="text-sm text-muted">لا توجد تفاصيل منتجات لهذا الطلب.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-right text-sm"><thead className="text-xs text-muted"><tr><th className="pb-3 pe-3 font-medium">المنتج</th><th className="pb-3 px-3 font-medium">اللون والخامة</th><th className="pb-3 px-3 font-medium">الكمية</th><th className="pb-3 ps-3 font-medium">الإجمالي</th></tr></thead><tbody>{(items ?? []).map((item) => <tr key={item.id} className="border-t border-border"><td className="py-3 pe-3">{(item.snapshot as { name?: string })?.name ?? "منتج"}</td><td className="px-3 py-3">{[item.color_name, item.material_name].filter(Boolean).join(" / ") || "—"}</td><td className="px-3 py-3 tabular-nums">{Number(item.quantity).toLocaleString("ar-YE-u-nu-latn")}</td><td className="py-3 ps-3 font-medium">{formatOldYer(Number(item.line_total_old_yer))}</td></tr>)}</tbody></table></div>}
      </SectionCard>

      <OrderActions orderId={order.id} status={order.order_status} proofs={(proofs ?? []).map((proof) => ({ id: proof.id, status: proof.status, createdAt: proof.created_at, mimeType: proof.mime_type }))} balance={{
        status: order.balance_status ?? "legacy_untracked",
        remainingOldYer: Number(order.remaining_old_yer),
        payableRemaining: Number(order.payable_remaining),
        currency,
        paidAt: order.balance_paid_at ?? null,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
      }} />

      <SectionCard title="سجل تغييرات الحالة">
        {(history ?? []).length === 0 ? <p className="text-sm text-muted">لا توجد تغييرات مسجلة حتى الآن.</p> : <ol className="space-y-3">{(history ?? []).map((row) => <li key={row.id} className="flex flex-wrap items-start justify-between gap-2 border-s-2 border-border pb-3 pe-3 ps-4 text-sm"><div><span>{row.from_status ? ORDER_STATUS_LABELS[row.from_status] ?? "حالة سابقة" : "إنشاء الطلب"}</span><span className="mx-2 text-muted" aria-hidden="true">←</span><span className="font-semibold">{ORDER_STATUS_LABELS[row.to_status] ?? "حالة غير معروفة"}</span>{row.note ? <p className="mt-1 text-xs text-muted">{row.note}</p> : null}</div><time className="text-xs text-muted">{new Date(row.created_at).toLocaleString("ar-YE-u-nu-latn")}</time></li>)}</ol>}
      </SectionCard>
      <Link href="/admin/orders" className="inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-slate-50">العودة إلى الطلبات</Link>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-medium">{value || "—"}</dd></div>;
}

function MoneyRow({ label, value, strong = false }: { label: string; value: number | string; strong?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 ${strong ? "border-y border-border py-3 text-base font-bold" : ""}`}><dt className={strong ? "" : "text-muted"}>{label}</dt><dd className="whitespace-nowrap">{formatOldYer(Number(value))}</dd></div>;
}
