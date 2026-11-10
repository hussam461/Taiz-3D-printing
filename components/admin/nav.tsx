"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAdmin } from "@/lib/admin/actions";

const GROUPS = [
  { title: "التشغيل", links: [["نظرة عامة", "/admin"], ["الطلبات", "/admin/orders"], ["إثباتات الدفع", "/admin/payment-proofs"]] },
  { title: "الكتالوج", links: [["المنتجات", "/admin/products"], ["التصنيفات", "/admin/categories"], ["الألوان", "/admin/colors"], ["الخامات", "/admin/materials"]] },
  { title: "التوصيل والدفع", links: [["مناطق التوصيل", "/admin/delivery"], ["التوصيل المجاني", "/admin/offers"], ["حسابات الدفع", "/admin/payment-accounts"], ["العملات والتحويل", "/admin/currencies"]] },
  { title: "المحتوى", links: [["معلومات المتجر", "/admin/store-information"], ["شرائح الصفحة الرئيسية", "/admin/homepage-slides"], ["مزايا المتجر الرئيسية", "/admin/homepage-benefits"], ["صفحة الطلب المخصص", "/admin/custom-order"], ["معلومات التواصل", "/admin/contact-information"], ["الأسئلة الشائعة", "/admin/faq"], ["الصفحات القانونية", "/admin/legal-pages"]] },
  { title: "النظام", links: [["الإعدادات", "/admin/settings"]] },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav className="space-y-5">{GROUPS.map((group) => <div key={group.title}><p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-white/40">{group.title}</p><div className="space-y-1">{group.links.map(([label, href]) => { const active = href === "/admin" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={onNavigate} className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white font-semibold text-navy shadow-sm" : "text-white/70 hover:bg-white/10 hover:text-white"}`}><span>{label}</span>{active ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}</Link>; })}</div></div>)}</nav>;
}

function MobileMenu() {
  const [open, setOpen] = useState(false);
  return <div className="relative md:hidden"><button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-sm transition hover:bg-white/10"><span className="text-base">☰</span>{open ? "إغلاق" : "القائمة"}</button>{open ? <div className="absolute end-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl border border-white/10 bg-navy p-3 shadow-2xl shadow-black/30"><NavLinks onNavigate={() => setOpen(false)} /><form action={logoutAdmin} className="mt-4 border-t border-white/10 pt-4"><button className="w-full rounded-xl px-3 py-2 text-start text-sm text-white/65 hover:bg-white/10 hover:text-white">تسجيل الخروج</button></form></div> : null}</div>;
}

export function AdminNav() { return <aside className="relative z-20 w-full shrink-0 border-b border-white/10 bg-navy text-white md:sticky md:top-0 md:h-screen md:w-72 md:max-w-72 md:flex-none md:overflow-y-auto md:overscroll-contain md:border-b-0 md:border-e"><div className="flex items-center justify-between px-4 py-4 sm:px-5 sm:py-5 md:block"><Link href="/admin" className="text-lg font-bold tracking-tight">Taiz 3D Printing <span className="text-xs font-normal text-white/45">Admin</span></Link><MobileMenu /></div><div className="hidden px-4 pb-8 md:block"><div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs text-white/45">لوحة التحكم</p><p className="mt-1 text-sm font-semibold">إدارة المتجر والطلبات</p></div><NavLinks /><form action={logoutAdmin} className="mt-8 border-t border-white/10 pt-5"><button className="rounded-xl px-3 py-2 text-sm text-white/60 transition hover:bg-white/10 hover:text-white">تسجيل الخروج</button></form></div></aside>; }
