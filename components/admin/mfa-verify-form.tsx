"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/browser";

export function AdminMfaVerifyForm({ next }: { next: string }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const router = useRouter();
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void supabase.auth.mfa.listFactors().then(({ data, error: factorsError }) => {
      const factor = data?.totp.find((item) => item.status === "verified");
      if (factorsError || !factor) {
        setError("لم نعثر على وسيلة مصادقة مرتبطة. سجّل الدخول مجددًا أو تواصل مع مدير النظام.");
        return;
      }
      setFactorId(factor.id);
    });
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId || !/^\d{6}$/.test(code)) {
      setError("أدخل الرمز المكوّن من 6 أرقام.");
      return;
    }
    setPending(true);
    setError("");
    const challenge = await supabase.auth.mfa.challenge({ factorId });
    if (challenge.error || !challenge.data) {
      setError("تعذر بدء التحقق. حدّث الصفحة وحاول مرة أخرى.");
      setPending(false);
      return;
    }
    const verification = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
    if (verification.error) {
      setError("الرمز غير صحيح أو انتهت صلاحيته. حاول مرة أخرى.");
      setPending(false);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5 rounded-3xl border border-border bg-white p-5 shadow-xl sm:p-8">
    <div>
      <p className="text-sm font-semibold text-primary">تحقق إضافي</p>
      <h1 className="mt-2 text-2xl font-bold">أكمل تسجيل الدخول</h1>
      <p className="mt-2 text-sm leading-6 text-muted">أدخل الرمز الحالي من تطبيق المصادقة المرتبط بحساب المدير.</p>
    </div>
    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p> : null}
    <label className="block text-sm font-medium">رمز المصادقة
      <input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={6} className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-center text-2xl tracking-[0.4em] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10" placeholder="000000" />
    </label>
    <button disabled={pending || !factorId || code.length !== 6} className="min-h-12 w-full rounded-xl bg-primary px-4 py-3 font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{pending ? "جارٍ التحقق..." : "تأكيد الدخول"}</button>
    <a href="/admin/login" className="block text-center text-sm text-muted underline-offset-4 hover:underline">العودة لتسجيل الدخول</a>
  </form>;
}
