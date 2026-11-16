"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createBrowserSupabase } from "@/lib/supabase/browser";

function normalizeQrDataUrl(value: string) {
  const trimmed = value.trim();
  const commaIndex = trimmed.indexOf(",");
  if (!trimmed.startsWith("data:image/svg+xml") || commaIndex < 0 || trimmed.slice(0, commaIndex).includes(";base64")) {
    return trimmed;
  }

  const metadata = trimmed.slice(0, commaIndex);
  const payload = trimmed.slice(commaIndex + 1);
  let svg = payload;
  try {
    svg = decodeURIComponent(payload);
  } catch {
    // Raw SVG may contain percent signs that are not URL escapes.
  }
  return `${metadata},${encodeURIComponent(svg)}`;
}

export function AdminMfaSetupForm({ next }: { next: string }) {
  const factorName = "Taiz 3D Printing Admin";
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const started = useRef(false);
  const [factor, setFactor] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loadingFactor, setLoadingFactor] = useState(true);

  const startEnrollment = useCallback(async () => {
    setLoadingFactor(true);
    setError("");
    setFactor(null);
    try {
      let { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: factorName,
      });

      // A previous interrupted setup can leave an unverified factor behind.
      // Remove only that incomplete factor, then create a fresh QR code.
      if (enrollError?.code === "mfa_factor_name_conflict") {
        const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
        if (!listError) {
          const incompleteFactor = factors.all.find((factor) =>
            factor.factor_type === "totp" &&
            factor.status === "unverified" &&
            factor.friendly_name === factorName
          );

          if (incompleteFactor) {
            const { error: cleanupError } = await supabase.auth.mfa.unenroll({ factorId: incompleteFactor.id });
            if (!cleanupError) {
              const retry = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: factorName });
              data = retry.data;
              enrollError = retry.error;
            } else {
              setError(`وجدنا إعداد TOTP غير مكتمل وتعذر تنظيفه. رمز الخطأ: ${cleanupError.code ?? "unknown"}`);
              return;
            }
          }
        }
      }

      if (enrollError || !data) {
        const errorCode = enrollError?.code;
        setError(errorCode === "mfa_totp_enroll_not_enabled"
          ? `تسجيل TOTP معطّل في إعدادات MFA بمشروع Supabase. رمز الخطأ: ${errorCode}`
          : errorCode === "mfa_factor_name_conflict"
            ? "يوجد عامل مصادقة بهذا الاسم. لم نحذفه لأنه غير معروف كإعداد غير مكتمل؛ أعد المحاولة أو راجع عوامل المصادقة للحساب."
          : errorCode
            ? `رفض Supabase إنشاء رمز الربط. رمز الخطأ: ${errorCode}`
            : "تعذر إنشاء رمز الربط دون رمز خطأ. تحقق من جلسة المدير والاتصال بمشروع Supabase، ثم أعد المحاولة.");
        return;
      }
      setFactor({ id: data.id, qrCode: normalizeQrDataUrl(data.totp.qr_code), secret: data.totp.secret });
    } catch {
      setError("تعذر الاتصال بخدمة المصادقة. تحقق من الاتصال ثم أعد المحاولة.");
    } finally {
      setLoadingFactor(false);
    }
  }, [factorName, supabase]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startEnrollment();
  }, [startEnrollment]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factor || !/^\d{6}$/.test(code)) {
      setError("أدخل الرمز المكوّن من 6 أرقام من تطبيق المصادقة.");
      return;
    }
    setPending(true);
    setError("");
    const challenge = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (challenge.error || !challenge.data) {
      setError("تعذر بدء التحقق. حدّث الصفحة وحاول مرة أخرى.");
      setPending(false);
      return;
    }
    const verification = await supabase.auth.mfa.verify({ factorId: factor.id, challengeId: challenge.data.id, code });
    if (verification.error) {
      setError("الرمز غير صحيح أو انتهت صلاحيته. تحقق من ساعة الهاتف وحاول مجددًا.");
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return <form onSubmit={handleSubmit} className="w-full max-w-lg space-y-5 rounded-3xl border border-border bg-white p-5 shadow-xl sm:p-8">
    <div>
      <p className="text-sm font-semibold text-primary">حماية لوحة الإدارة</p>
      <h1 className="mt-2 text-2xl font-bold">إعداد المصادقة الثنائية</h1>
      <p className="mt-2 text-sm leading-6 text-muted">اربط حساب المدير بتطبيق مصادقة مثل Google Authenticator أو Microsoft Authenticator.</p>
    </div>
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p> : null}
    {factor ? <>
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-slate-50 p-4">
        <Image src={factor.qrCode} alt="رمز QR لإعداد المصادقة الثنائية" width={192} height={192} unoptimized className="h-48 w-48 rounded-lg bg-white p-2" />
        <p className="text-center text-xs text-muted">امسح الرمز بتطبيق المصادقة، أو أدخل المفتاح يدويًا:</p>
        <code dir="ltr" className="max-w-full break-all rounded-lg bg-white px-3 py-2 text-sm font-semibold tracking-wider text-text">{factor.secret}</code>
      </div>
      <label className="block text-sm font-medium">رمز التحقق
        <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-center text-xl tracking-[0.4em] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" placeholder="000000" />
      </label>
      <button disabled={pending || code.length !== 6} className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{pending ? "جارٍ التحقق..." : "تأكيد وربط الحساب"}</button>
    </> : loadingFactor ? (
      <div role="status" className="rounded-xl border border-border bg-slate-50 p-4 text-sm text-muted">جارٍ تجهيز رمز الربط...</div>
    ) : error ? (
      <button type="button" onClick={() => void startEnrollment()} className="min-h-11 rounded-xl border border-border px-4 py-2 text-sm font-semibold text-text transition hover:bg-slate-50">
        إعادة المحاولة
      </button>
    ) : null}
  </form>;
}
