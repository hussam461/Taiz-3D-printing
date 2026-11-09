"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { loginAdmin } from "@/lib/admin/actions";

type LoginState = { ok: boolean; error?: string } | null;

export function AdminLoginForm({ next }: { next: string }) {
  const emailRef = useRef<HTMLInputElement>(null);
  const [offline, setOffline] = useState(false);
  const [state, action, pending] = useActionState(async (_previous: LoginState, formData: FormData) => {
    if (!navigator.onLine) return { ok: false, error: "لا يوجد اتصال بالإنترنت. تحقق من الشبكة ثم حاول مرة أخرى." };
    try {
      return await loginAdmin(formData);
    } catch (error) {
      if ((error as { digest?: string } | null)?.digest?.startsWith("NEXT_REDIRECT")) throw error;
      return { ok: false, error: "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى." };
    }
  }, null);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => { if (state && !state.ok) emailRef.current?.focus(); }, [state]);
  const message = offline ? "لا يوجد اتصال بالإنترنت. أعد الاتصال قبل تسجيل الدخول." : state && !state.ok ? state.error : null;
  return <form action={action} className="w-full max-w-md space-y-5 rounded-3xl border border-white/10 bg-white p-6 shadow-2xl shadow-black/20 sm:p-9">
    <input type="hidden" name="next" value={next} />
    <div><p className="text-sm font-semibold text-primary">Taiz 3D Printing</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-text">مرحبًا بعودتك</h1><p className="mt-2 text-sm leading-6 text-muted">سجّل الدخول لإدارة المنتجات والطلبات والمتجر من مكان واحد.</p></div>
    {message ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-error" role="alert">{message}</div> : null}
    <label className="grid gap-2 text-sm font-medium text-text">البريد الإلكتروني<input ref={emailRef} name="email" type="email" required autoComplete="email" placeholder="admin@example.com" className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" /></label>
    <label className="grid gap-2 text-sm font-medium text-text">كلمة المرور<input name="password" type="password" required minLength={6} autoComplete="current-password" placeholder="أدخل كلمة المرور" className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm transition placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10" /></label>
    <button disabled={pending || offline} className="flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60">{pending ? "جارٍ التحقق..." : "دخول لوحة الإدارة"}</button>
    <p className="text-center text-xs leading-5 text-muted">الوصول مخصص لحسابات المدير المعتمدة فقط.</p>
  </form>;
}
