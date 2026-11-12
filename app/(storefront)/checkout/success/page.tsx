import Link from "next/link";
import { formatMoney } from "@/lib/formatting/money";
import type { PaymentCurrency } from "@/types/domain";
import { getStorefrontContext } from "@/lib/queries/storefront";
import { whatsappNumber } from "@/lib/formatting/whatsapp";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    ref?: string;
    status?: string;
    currency?: string;
    payableTotal?: string;
    payableDeposit?: string;
    payableRemaining?: string;
  }>;
}) {
  const params = await searchParams;
  const { contact } = await getStorefrontContext();
  if (!params.ref) {
    return <p>لا توجد بيانات تأكيد.</p>;
  }
  const currency: PaymentCurrency = params.currency === "NEW_YER" ? "NEW_YER" : "OLD_YER";
  const payableDeposit = Number(params.payableDeposit ?? 0);
  const payableRemaining = Number(params.payableRemaining ?? 0);
  const payableTotal = Number(params.payableTotal ?? payableDeposit + payableRemaining);
  return (
    <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="border-b border-border bg-emerald-50/70 px-5 py-7 text-center sm:px-8">
        <span aria-hidden="true" className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
        <h1 className="mt-3 text-2xl font-bold">تم استلام طلبك</h1>
        <p className="mt-2 text-sm text-muted">رقم الطلب <span className="font-mono font-semibold text-text" dir="ltr">{params.ref}</span></p>
      </div>
      <div className="space-y-4 p-5 sm:p-8">
        <div className="rounded-xl border border-border p-4 sm:p-5">
          <p className="text-xs text-muted">ملخص المبالغ بعملة الدفع المختارة</p>
          <p className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold">إجمالي الطلب <span className="font-normal text-muted">(شامل التوصيل)</span></span><span className="font-bold">{formatPaymentMoney(payableTotal, currency)}</span></p>
          <p className="mt-3 flex items-center justify-between gap-3 text-sm"><span className="text-muted">العربون المحوّل</span><span className="font-semibold text-primary">{formatPaymentMoney(payableDeposit, currency)}</span></p>
          <p className="mt-2 flex items-center justify-between gap-3 text-sm"><span className="text-muted">المتبقي عند الاستلام</span><span className="font-semibold">{formatPaymentMoney(payableRemaining, currency)}</span></p>
        </div>
        <div className="rounded-xl bg-bg p-4">
          <p className="font-semibold">حالة الدفع: بانتظار مراجعة إثبات التحويل</p>
          <p className="mt-2 text-sm leading-6 text-muted">سنراجع إثبات العربون ثم نبدأ تجهيز طلبك. سنتواصل معك لتنسيق التسليم، ويُدفع المتبقي عند الاستلام. احتفظ برقم الطلب للمتابعة.</p>
        </div>
        {contact.whatsapp ? (
          <a className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700" href={`https://wa.me/${whatsappNumber(contact.whatsapp)}?text=${encodeURIComponent(`السلام عليكم، لدي استفسار عن الطلب رقم ${params.ref}.`)}`} target="_blank" rel="noreferrer">
            استفسار عبر واتساب
          </a>
        ) : null}
        <div className="text-center">
          <Link href="/products" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-5 text-sm font-semibold text-text transition hover:border-primary hover:text-primary">
            العودة إلى المنتجات
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatPaymentMoney(amount: number, currency: PaymentCurrency) {
  return formatMoney(amount, currency).replace(/ (?:قديم|جديد)$/, "");
}
