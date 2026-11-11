"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, type CartItem } from "@/components/storefront/cart-provider";
import { discardCheckoutProof, submitCheckoutAction, uploadCheckoutProof } from "@/lib/orders/actions";
import {
  amountInPaymentCurrency,
  calculateOrderTotals,
} from "@/lib/pricing";
import { formatMoney } from "@/lib/formatting/money";
import type { PaymentCurrency } from "@/types/domain";
import { ALLOWED_PROOF_TYPES, MAX_PROOF_BYTES } from "@/types/domain";

type ProofUploadState = {
  status: "idle" | "uploading" | "uploaded" | "error";
  path?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
};

type Area = {
  id: string;
  governorate: string;
  city_area: string | null;
  fee_old_yer: number;
  is_default?: boolean;
};

type Account = {
  id: string;
  name: string;
  account_number: string;
  currency_code: PaymentCurrency;
  instructions: string;
};

export function CheckoutForm({
  areas,
  accounts,
  depositPercent,
  freeDeliveryEnabled,
  freeDeliveryMin,
  newRialPerOldRial,
}: {
  areas: Area[];
  accounts: Account[];
  depositPercent: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryMin: number;
  newRialPerOldRial: number;
}) {
  const { items, ready, clear } = useCart();
  const [directItem, setDirectItem] = useState<CartItem | null>(null);
  const [directReady, setDirectReady] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState<PaymentCurrency>("OLD_YER");
  const [areaId, setAreaId] = useState(areas.find((row) => row.is_default)?.id ?? areas[0]?.id ?? "");
  const [accountId, setAccountId] = useState("");
  const [copied, setCopied] = useState(false);
  const copyResetTimer = useRef<number | null>(null);
  const idempotencyKey = useRef<string | null>(null);
  const [proofUpload, setProofUpload] = useState<ProofUploadState>({ status: "idle" });
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = sessionStorage.getItem("taiz-printer-direct-purchase");
        if (stored) setDirectItem(JSON.parse(stored) as CartItem);
      } catch {
        sessionStorage.removeItem("taiz-printer-direct-purchase");
      }
      setDirectReady(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const path = proofUpload.path;
    return () => {
      if (path) void discardCheckoutProof(path);
    };
  }, [proofUpload.path]);

  useEffect(() => () => {
    if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
  }, []);

  const area = areas.find((row) => row.id === areaId);
  const checkoutItems = useMemo(() => directItem ? [directItem] : items, [directItem, items]);
  const compatibleAccounts = accounts.filter((row) => row.currency_code === currency);
  const selectedAccount =
    compatibleAccounts.find((row) => row.id === accountId) ?? compatibleAccounts[0];

  const totals = useMemo(() => {
    if (checkoutItems.length === 0) return null;
    return calculateOrderTotals({
      lines: checkoutItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        basePriceOldYer: item.basePriceOldYer,
        discountPercent: item.discountPercent,
      })),
      delivery: {
        feeOldYer: Number(area?.fee_old_yer ?? 0),
        freeDeliveryEnabled,
        freeDeliveryMinOldYer: freeDeliveryMin,
      },
      depositPercent,
    });
  }, [checkoutItems, area, freeDeliveryEnabled, freeDeliveryMin, depositPercent]);

  if (!ready || !directReady) return <p>جارٍ التحضير…</p>;
  if (checkoutItems.length === 0) {
    return (
      <p>
        السلة فارغة. <Link href="/products">العودة للمنتجات</Link>
      </p>
    );
  }
  if (!totals) return null;

  const payableTotal = amountInPaymentCurrency(totals.finalTotalOldYer, currency, newRialPerOldRial);
  const payableDelivery = amountInPaymentCurrency(totals.deliveryFeeOldYer, currency, newRialPerOldRial);
  const payableDeposit = amountInPaymentCurrency(totals.depositOldYer, currency, newRialPerOldRial);
  const payableRemaining = amountInPaymentCurrency(
    totals.remainingOldYer,
    currency,
    newRialPerOldRial,
  );

  return (
    <form
      className="checkout-form mx-auto w-full max-w-3xl space-y-4 sm:space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        const form = event.currentTarget;
        const data = new FormData(form);
        if (!proofUpload.path || proofUpload.status !== "uploaded") {
          setError(proofUpload.status === "uploading" ? "انتظر حتى يكتمل رفع إثبات التحويل." : "ارفع إثبات التحويل بنجاح قبل إرسال الطلب.");
          return;
        }
        data.set("items", JSON.stringify(checkoutItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          colorId: item.colorId,
          materialId: item.materialId,
        }))));
        idempotencyKey.current ??= createIdempotencyKey();
        data.set("idempotencyKey", idempotencyKey.current);
        data.set("paymentCurrency", currency);
        data.set("paymentAccountId", selectedAccount?.id ?? "");
        data.set("deliveryAreaId", areaId);
        data.set("proofPath", proofUpload.path);
        data.set("proofFileName", proofUpload.fileName ?? "payment-proof");
        start(async () => {
          const result = await submitCheckoutAction(data);
          if (!result.ok) {
            setError(result.error);
            if (result.proofMustBeReuploaded) {
              setProofUpload({ status: "error", error: "أعد رفع إثبات التحويل قبل إرسال الطلب." });
            }
            return;
          }
          if (directItem) sessionStorage.removeItem("taiz-printer-direct-purchase");
          else clear();
          const params = new URLSearchParams({
            ref: result.reference,
            status: result.paymentStatus,
            currency: result.paymentCurrency,
            payableTotal: String(amountInPaymentCurrency(result.finalTotalOldYer, result.paymentCurrency, newRialPerOldRial)),
            payableDeposit: String(result.payableDeposit),
            payableRemaining: String(result.payableRemaining),
          });
          router.push(`/checkout/success?${params.toString()}`);
        });
      }}
    >
      <div className="space-y-4 sm:space-y-5">
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <StepHeading number="1" title="بيانات المستلم" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">
              الاسم الكامل
              <input name="customerName" required autoComplete="name" className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none" />
            </label>
            <label className="text-sm">
              رقم الهاتف اليمني
              <input id="customer-phone" name="customerPhone" required autoComplete="tel" inputMode="tel" dir="ltr" aria-describedby="customer-phone-help" className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none" />
              <span id="customer-phone-help" className="mt-1 block text-sm leading-5 text-muted">تأكد من صحة الرقم؛ سنتواصل معك لتأكيد الطلب والتسليم.</span>
            </label>
            <label className="text-sm sm:col-span-2">
              البريد (اختياري)
              <input name="customerEmail" type="email" autoComplete="email" className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none" />
            </label>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <StepHeading number="2" title="عنوان التوصيل" />
          <label className="mt-3 block text-sm">
            المنطقة
            <select
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none"
            >
              {areas.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.governorate}
                  {row.city_area ? ` — ${row.city_area}` : ""} ({Number(row.fee_old_yer) === 0 ? "التوصيل مجاني" : formatCheckoutMoney(amountInPaymentCurrency(Number(row.fee_old_yer), currency, newRialPerOldRial), currency)})
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            العنوان التفصيلي
            <textarea name="address" required autoComplete="street-address" rows={3} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none" />
          </label>
          <label className="mt-3 block text-sm">
            ملاحظات التوصيل (اختياري)
            <textarea name="deliveryNotes" rows={2} className="mt-1.5 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none" />
          </label>
        </section>
        <section className="rounded-2xl border border-primary/20 bg-surface p-4 shadow-sm sm:p-6">
          <StepHeading number="3" title="راجع الطلب ومبلغ العربون" />
          <p className="mt-2 text-sm leading-6 text-muted">اختر عملة الدفع لمراجعة المبلغ المطلوب قبل التحويل.</p>
          <fieldset className="mt-4">
            <legend className="mb-2 text-sm font-semibold">عملة الدفع</legend>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${currency === "OLD_YER" ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-text hover:bg-slate-50"}`}>
                <input type="radio" checked={currency === "OLD_YER"} onChange={() => setCurrency("OLD_YER")} className="accent-primary" />
                ر.ي قديم
              </label>
              <label className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${currency === "NEW_YER" ? "border-primary bg-primary/5 text-primary" : "border-border bg-white text-text hover:bg-slate-50"}`}>
                <input type="radio" checked={currency === "NEW_YER"} onChange={() => setCurrency("NEW_YER")} className="accent-primary" />
                ر.ي جديد
              </label>
            </div>
          </fieldset>
          <p className="mt-2 text-sm leading-5 text-muted">المبالغ أدناه معروضة بعملة الدفع التي اخترتها.</p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between gap-3"><span className="text-muted">رسوم التوصيل</span><span>{totals.deliveryFeeOldYer === 0 ? "مجاني" : formatCheckoutMoney(payableDelivery, currency)}</span></p>
            <p className="flex justify-between gap-3 border-t border-border pt-2"><span className="font-semibold">إجمالي الطلب بعملة التحويل</span><span className="font-bold">{formatCheckoutMoney(payableTotal, currency)}</span></p>
            <p className="flex justify-between gap-3"><span className="font-semibold text-primary">العربون المطلوب الآن ({totals.depositPercent}%)</span><span className="font-semibold text-primary">{formatCheckoutMoney(payableDeposit, currency)}</span></p>
            <p className="flex justify-between gap-3"><span className="text-muted">المتبقي عند الاستلام</span><span>{formatCheckoutMoney(payableRemaining, currency)}</span></p>
          </div>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
          <StepHeading number="4" title="التحويل وإثبات الدفع" />
          <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden="true" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-primary shadow-sm">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M4 7.5h16v11H4zM4 10h16M7 15h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 3v3m-4-3v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">مبلغ العربون للتحويل</p>
                  <p className="mt-0.5 text-sm text-muted">حوّل هذا المبلغ إلى الحساب أدناه</p>
                </div>
              </div>
              <p className="shrink-0 text-base font-bold tabular-nums text-primary sm:text-lg">{formatCheckoutMoney(payableDeposit, currency)}</p>
            </div>
            <div className="mt-3 flex justify-between gap-3 border-t border-primary/10 pt-3 text-sm">
              <span className="text-muted">المتبقي عند الاستلام</span>
              <span className="font-semibold text-text">{formatCheckoutMoney(payableRemaining, currency)}</span>
            </div>
          </div>
          {compatibleAccounts.length === 0 ? (
            <p className="mt-3 text-error">لا يوجد حساب نشط لهذه العملة.</p>
          ) : (
            <label className="mt-3 block text-sm">
              حساب التحويل
              <select
                value={selectedAccount?.id}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1.5 min-h-12 w-full rounded-xl border border-border bg-white px-3 py-2 outline-none transition focus:border-primary focus-visible:outline-none"
              >
                {compatibleAccounts.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} — {row.account_number}
                  </option>
                ))}
              </select>
            </label>
          )}
          {selectedAccount ? (
            <div className="mt-3 rounded-2xl border border-border bg-slate-50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-text">بيانات الحساب للتحويل</p>
              <p className="mt-1 text-sm leading-6 text-muted">حوّل مبلغ العربون الموضح أعلاه إلى الحساب التالي.</p>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-white p-3">
                <div>
                  <p className="text-xs text-muted">{selectedAccount.name}</p>
                  <p className="mt-1 font-mono text-lg font-bold tracking-wide text-navy" dir="ltr">{selectedAccount.account_number}</p>
                </div>
                <button
                  type="button"
                  aria-label={copied ? "تم نسخ رقم الحساب" : "نسخ رقم الحساب"}
                  title={copied ? "تم نسخ رقم الحساب" : "نسخ رقم الحساب"}
                  className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${copied ? "border-emerald-600 bg-emerald-600 text-white" : "border-primary/25 bg-white text-primary hover:bg-primary/5"}`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(selectedAccount.account_number);
                    setCopied(true);
                    if (copyResetTimer.current !== null) window.clearTimeout(copyResetTimer.current);
                    copyResetTimer.current = window.setTimeout(() => {
                      setCopied(false);
                      copyResetTimer.current = null;
                    }, 2200);
                  }}
                >
                  {copied ? (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4"><rect x="8" y="8" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.7"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
                  )}
                </button>
              </div>
            </div>
          ) : null}
          <div className="mt-4">
            <p className="text-sm font-semibold">إثبات التحويل <span className="text-error">*</span></p>
            <p id="proof-help" className="mt-1 text-sm leading-6 text-muted">أرفق إيصال التحويل بعد إتمامه كصورة JPG أو PNG أو WebP، أو كملف PDF. الحد الأقصى للحجم 8 ميغابايت.</p>
            <input
              id="payment-proof"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="peer sr-only"
              aria-required="true"
              aria-describedby="proof-help proof-status"
              onChange={async (event) => {
                const input = event.currentTarget;
                const file = input.files?.[0];
                input.value = "";
                if (!file) return;
                setError(null);
                if (!(ALLOWED_PROOF_TYPES as readonly string[]).includes(file.type)) {
                  setProofUpload((current) => ({ ...current, error: "نوع الملف غير مدعوم. اختر صورة JPG أو PNG أو WebP أو ملف PDF." }));
                  return;
                }
                if (file.size > MAX_PROOF_BYTES) {
                  setProofUpload((current) => ({ ...current, error: "حجم الملف يتجاوز الحد المسموح (8 ميغابايت). اختر إيصالًا أصغر حجمًا ثم أعد المحاولة." }));
                  return;
                }
                const previous = proofUpload;
                setProofUpload({ status: "uploading", path: previous.path, fileName: previous.fileName, fileSize: previous.fileSize });
                const body = new FormData();
                body.set("proof", file);
                try {
                  const result = await uploadCheckoutProof(body);
                  if (!result.ok) {
                    setProofUpload({ ...previous, error: `${result.error}${previous.path ? " بقي الإثبات السابق محفوظًا ويمكنك استخدامه." : ""}` });
                    return;
                  }
                  setProofUpload({ status: "uploaded", path: result.path, fileName: result.fileName, fileSize: result.fileSize });
                } catch {
                  setProofUpload({ ...previous, error: `تعذر رفع الإثبات بسبب مشكلة اتصال. حاول مرة أخرى.${previous.path ? " بقي الإثبات السابق محفوظًا." : ""}` });
                }
              }}
            />
            <label htmlFor="payment-proof" className="mt-3 inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-primary bg-white px-5 text-sm font-semibold text-primary transition hover:bg-blue-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary">
              {proofUpload.status === "uploading" ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" aria-hidden="true" />جاري رفع الإثبات...</> : <><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15.5v2A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>{proofUpload.path ? "استبدال صورة الإثبات" : "رفع صورة الإثبات"}</>}
            </label>
            <div id="proof-status" aria-live="polite" className="mt-2 text-sm">
              {proofUpload.status === "uploading" ? <p className="text-muted">يتم رفع الملف الآن. سيظهر التأكيد هنا قبل إرسال الطلب.</p> : null}
              {proofUpload.status === "uploaded" && !proofUpload.error ? <p className="font-medium text-success">تم رفع الإثبات بنجاح: {proofUpload.fileName} ({Math.max(1, Math.ceil((proofUpload.fileSize ?? 0) / 1024))} كيلوبايت). يمكنك الآن إرسال الطلب.</p> : null}
              {proofUpload.error ? <p role="alert" className="font-medium text-error">{proofUpload.error}</p> : null}
            </div>
          </div>
          {error ? <p role="alert" className="mt-4 rounded-xl border border-error/20 bg-red-50 p-3 text-sm text-error">{error}</p> : null}
          <button type="submit" disabled={pending || proofUpload.status === "uploading" || !proofUpload.path || !selectedAccount} className="mt-4 min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">
            {pending ? "جارٍ إرسال الطلب..." : "تأكيد الطلب وإرساله"}
          </button>
        </section>
      </div>
    </form>
  );
}

function formatCheckoutMoney(amount: number, currency: PaymentCurrency) {
  return formatMoney(amount, currency).replace(/ (?:قديم|جديد)$/, "");
}

function StepHeading({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{number}</span>
      <h2 className="font-semibold text-text">{title}</h2>
    </div>
  );
}

function createIdempotencyKey() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  if (typeof cryptoApi.getRandomValues === "function") {
    cryptoApi.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}
