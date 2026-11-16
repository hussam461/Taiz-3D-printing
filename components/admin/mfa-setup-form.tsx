"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AdminMfaSetupForm({ next }: { next: string }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const started = useRef(false);
  const [factor, setFactor] = useState<{ id: string; qrCode: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Taiz 3D Printing Admin" })
      .then(({ data, error: enrollError }) => {
        if (enrollError || !data) {
          setError("تعذر إعداد المصادقة الثنائية. تأكد من تفعيل TOTP في إعدادات Supabase ثم أعد المحاولة.");
          return;
        }
        setFactor({ id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
      });
  }, [supabase]);

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
    </> : <div className="rounded-xl border border-border bg-slate-50 p-4 text-sm text-muted">جارٍ تجهيز رمز الربط...</div>}
  </form>;
}
