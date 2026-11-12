import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { OrderActions } from "@/components/admin/order-actions";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin/ui";
import { ORDER_STATUS_KINDS, ORDER_STATUS_LABELS, PAYMENT_STATUS_KINDS, PAYMENT_STATUS_LABELS } from "@/lib/admin/order-labels";
import { formatMoney } from "@/lib/formatting/money";
import { whatsappNumber } from "@/lib/formatting/whatsapp";
import { publicMediaUrl } from "@/lib/storage/public-url";
import { amountInPaymentCurrency } from "@/lib/pricing";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (!order) notFound();
  const [{ data: items }, { data: proofs }, { data: activeMaterials }] = await Promise.all([
    supabase.from("order_items").select("*").eq("order_id", id),
    supabase.from("payment_proofs").select("*").eq("order_id", id).order("created_at", { ascending: false }),
    supabase.from("materials").select("id, name").eq("is_active", true),
  ]);
  const orderStatus = ORDER_STATUS_LABELS[order.order_status] ?? "حالة غير معروفة";
  const paymentStatus = PAYMENT_STATUS_LABELS[order.payment_status] ?? "حالة دفع غير معروفة";
  const phone = whatsappNumber(String(order.customer_phone));
  const currency = order.payment_currency === "NEW_YER" ? "NEW_YER" : "OLD_YER";
  const currencySnapshot = order.snapshot_currency as { new_rial_per_old_rial?: number } | null;
  const savedRate = Number(currencySnapshot?.new_rial_per_old_rial ?? 0);
  const impliedRate = Number(order.final_total_old_yer) > 0
    ? Number(order.payable_total) / Number(order.final_total_old_yer)
    : 0;
  const exchangeRate = savedRate > 0 ? savedRate : impliedRate;
  const toOrderCurrency = (amountOldYer: number) => amountInPaymentCurrency(amountOldYer, currency, exchangeRate);
  const shippingInOrderCurrency = toOrderCurrency(Number(order.delivery_fee_old_yer));
  const productsInOrderCurrency = Math.max(0, Number(order.payable_total) - shippingInOrderCurrency);
  const activeMaterialIds = new Set((activeMaterials ?? []).map((material) => material.id));
  const activeMaterialNames = new Set((activeMaterials ?? []).map((material) => material.name.trim().toLocaleLowerCase()));
  const hasVisibleMaterials = (items ?? []).some((item) => {
    const snapshot = item.snapshot as { material_id?: string | null } | null;
    return Boolean(item.material_name?.trim() && (snapshot?.material_id ? activeMaterialIds.has(snapshot.material_id) : activeMaterialNames.has(item.material_name.trim().toLocaleLowerCase())));
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader eyebrow="تفاصيل الطلب" title={order.reference} description={`أُنشئ في ${new Date(order.created_at).toLocaleString("ar-YE-u-nu-latn")}`} />
      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="بيانات العميل والتواصل">
          <div className="space-y-3">
            <dl className="grid grid-cols-2 gap-2 text-sm sm:gap-2.5">
              <Detail label="اسم العميل" value={order.customer_name} />
              <div className="min-w-0 rounded-xl border border-border/80 bg-slate-50/70 px-3 py-2.5"><dt className="text-xs text-muted">رقم الهاتف</dt><dd dir="ltr" className="mt-1.5 break-all text-end text-sm font-semibold tabular-nums text-text">{order.customer_phone}</dd></div>
              <Detail label="المحافظة" value={order.delivery_governorate} />
              <div className="sm:col-span-2"><Detail label="العنوان التفصيلي" value={order.delivery_address} /></div>
            </dl>
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <a href={`tel:+${phone}`} dir="ltr" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-border bg-white px-3 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5 sm:flex-none">اتصال بالعميل</a>
              <a href={`https://wa.me/${phone}?text=${encodeURIComponent(`السلام عليكم ${order.customer_name}، بخصوص طلبك رقم ${order.reference}.`)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:flex-none">مراسلة واتساب</a>
            </div>
            <dl className="grid grid-cols-2 gap-2 border-t border-border pt-3 text-sm">
              <div className="min-w-0"><dt className="mb-1.5 text-xs text-muted">حالة الطلب</dt><dd><StatusBadge value={orderStatus} kind={ORDER_STATUS_KINDS[order.order_status] ?? "neutral"} /></dd></div>
              <div className="min-w-0"><dt className="mb-1.5 text-xs text-muted">حالة الدفع</dt><dd><StatusBadge value={paymentStatus} kind={PAYMENT_STATUS_KINDS[order.payment_status] ?? "neutral"} /></dd></div>
            </dl>
          </div>
        </SectionCard>
        <SectionCard title="ملخص المبالغ">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <MoneyRow label="قيمة المنتجات" value={productsInOrderCurrency} currency={currency} />
            <MoneyRow label="رسوم التوصيل" value={shippingInOrderCurrency} currency={currency} />
            <MoneyRow label="الإجمالي" value={order.payable_total} currency={currency} strong />
            <MoneyRow label={`العربون (${Number(order.deposit_percent).toLocaleString("ar-YE-u-nu-latn")}٪)`} value={order.payable_deposit} currency={currency} />
            <MoneyRow label="المتبقي عند التسليم" value={order.payable_remaining} currency={currency} highlight />
          </dl>
        </SectionCard>
      </div>

      <SectionCard title="منتجات الطلب">
        {(items ?? []).length === 0 ? <p className="text-sm text-muted">لا توجد تفاصيل منتجات لهذا الطلب.</p> : <div role="region" aria-label="جدول منتجات الطلب" tabIndex={0} className="max-w-full overflow-x-auto rounded-xl border border-border focus-visible:outline-2 focus-visible:outline-primary"><table className="w-full min-w-[850px] text-right text-sm"><thead className="bg-slate-50 text-xs text-muted"><tr><th className="px-3 py-3 font-medium sm:px-4">صورة المنتج</th><th className="px-3 py-3 font-medium sm:px-4">المنتج</th><th className="px-3 py-3 font-medium sm:px-4">اللون</th>{hasVisibleMaterials ? <th className="px-3 py-3 font-medium sm:px-4">الخامة</th> : null}<th className="px-3 py-3 font-medium sm:px-4">سعر الوحدة</th><th className="px-3 py-3 font-medium sm:px-4">الكمية</th><th className="px-3 py-3 font-medium sm:px-4">الإجمالي</th></tr></thead><tbody>{(items ?? []).map((item) => {
          const snapshot = item.snapshot as { name?: string; image?: string | null; material_id?: string | null } | null;
          const imageUrl = publicMediaUrl(snapshot?.image ?? null);
          const materialIsActive = Boolean(item.material_name?.trim() && (snapshot?.material_id ? activeMaterialIds.has(snapshot.material_id) : activeMaterialNames.has(item.material_name.trim().toLocaleLowerCase())));
          return <tr key={item.id} className="border-t border-border odd:bg-white even:bg-slate-50/70 transition-colors hover:bg-teal-50/70"><td className="px-3 py-3 sm:px-4">{imageUrl ? <div className="relative size-14 overflow-hidden rounded-lg border border-border bg-white"><Image src={imageUrl} alt={snapshot?.name ?? "صورة المنتج"} fill sizes="56px" unoptimized className="object-contain p-1" /></div> : <div aria-label="لا توجد صورة" className="flex size-14 items-center justify-center rounded-lg border border-dashed border-border bg-white text-[10px] text-muted">بدون صورة</div>}</td><td className="max-w-52 px-3 py-3 font-medium sm:px-4">{snapshot?.name ?? "منتج"}</td><td className="px-3 py-3 sm:px-4">{item.color_name?.trim() || "—"}</td>{hasVisibleMaterials ? <td className="px-3 py-3 sm:px-4">{materialIsActive ? item.material_name : "—"}</td> : null}<td className="whitespace-nowrap px-3 py-3 sm:px-4">{formatMoney(toOrderCurrency(Number(item.unit_final_price_old_yer)), currency)}</td><td className="px-3 py-3 tabular-nums sm:px-4">{Number(item.quantity).toLocaleString("ar-YE-u-nu-latn")}</td><td className="whitespace-nowrap px-3 py-3 font-semibold sm:px-4">{formatMoney(toOrderCurrency(Number(item.line_total_old_yer)), currency)}</td></tr>;
        })}</tbody></table></div>}
      </SectionCard>

      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-semibold">إجراء الطلب</h2>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <OrderActions orderId={order.id} status={order.order_status} customer={{ name: order.customer_name, phone: order.customer_phone, reference: order.reference }} proofs={(proofs ?? []).map((proof) => ({ id: proof.id, status: proof.status, createdAt: proof.created_at, mimeType: proof.mime_type }))} layout="toolbar" balance={{
            status: order.balance_status ?? "legacy_untracked",
            remainingOldYer: Number(order.remaining_old_yer),
            payableRemaining: Number(order.payable_remaining),
            currency,
            paidAt: order.balance_paid_at ?? null,
            orderStatus: order.order_status,
            paymentStatus: order.payment_status,
          }} />
          <Link href="/admin/orders" className="inline-flex min-h-11 items-center rounded-lg border border-border bg-white px-4 text-sm font-semibold transition hover:bg-slate-50">العودة إلى الطلبات</Link>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return <div className="min-w-0 rounded-xl border border-border/80 bg-slate-50/70 px-3 py-2.5"><dt className="text-xs text-muted">{label}</dt><dd className="mt-1.5 break-words text-sm font-semibold leading-5 text-text">{value || "—"}</dd></div>;
}

function MoneyRow({ label, value, currency, strong = false, highlight = false }: { label: string; value: number | string; currency: "OLD_YER" | "NEW_YER"; strong?: boolean; highlight?: boolean }) {
  return <div className={`flex min-w-0 items-center justify-between gap-3 rounded-xl border px-3 py-3 ${strong ? "border-primary/20 bg-primary/5 text-base font-bold" : highlight ? "border-blue-100 bg-blue-50 font-semibold text-blue-950" : "border-border bg-white"}`}><dt className="min-w-0 text-muted">{label}</dt><dd className="whitespace-nowrap font-semibold">{formatMoney(Number(value), currency)}</dd></div>;
}
