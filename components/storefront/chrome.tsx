import Link from "next/link";
import Image from "next/image";
import { MobileNavMenu } from "@/components/storefront/mobile-nav-menu";
import { DesktopNav } from "@/components/storefront/desktop-nav";
import { TopLink } from "@/components/storefront/top-link";
import { AnnouncementBar } from "@/components/storefront/announcement-bar";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/products", label: "المنتجات" },
  { href: "/custom-order", label: "طلب مخصّص" },
  { href: "/about", label: "من نحن" },
];

export function StoreHeader({
  storeName,
  logoUrl,
  cartSlot,
  announcement,
}: {
  storeName: string;
  logoUrl: string | null;
  cartSlot: React.ReactNode;
  announcement: { enabled: boolean; text: string; buttonLabel: string; href: string; scope: "all" | "home"; buttonEnabled: boolean };
}) {
  return (
    <header className="sticky top-0 z-40 w-full self-stretch border-b border-border/80 bg-white shadow-sm shadow-slate-900/[0.03]">
      <AnnouncementBar {...announcement} />
      <div className="mx-auto flex min-h-[4.25rem] w-full max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-2 sm:px-6 lg:px-8 xl:h-[4.75rem] xl:flex-nowrap xl:py-0">
        <form action="/products" role="search" autoComplete="off" className="order-1 flex h-10 w-full basis-full items-center gap-2 rounded-full border border-border bg-slate-50 px-2 focus-within:border-slate-400 focus-within:shadow-sm sm:h-11 xl:order-3 xl:h-10 xl:w-72 xl:basis-auto 2xl:w-80">
          <label htmlFor="store-header-search" className="sr-only">ابحث عن منتج</label>
          <button type="submit" aria-label="بحث" className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.7" /><path d="m16 16 4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
          </button>
          <input id="store-header-search" name="storefrontSearch" type="search" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" placeholder="ابحث عن منتج أو تصنيف..." className="store-search-field min-h-9 min-w-0 flex-1 appearance-none border-0 bg-transparent px-1 text-sm text-text outline-none shadow-none placeholder:text-muted/80 focus:border-0 focus:outline-none focus:ring-0 focus-visible:outline-none" />
        </form>
        <Link href="/" aria-label={`الصفحة الرئيسية — ${storeName}`} className="order-2 flex min-w-0 shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-navy sm:gap-2.5 sm:text-lg xl:order-1">
          {logoUrl ? <span className="flex h-9 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-14"><Image src={logoUrl} alt="" width={160} height={64} unoptimized className="max-h-full max-w-full object-contain" /></span> : null}
          <span className="max-w-[8.5rem] truncate sm:max-w-56">{storeName}</span>
        </Link>
        <DesktopNav items={NAV} />
        <div className="order-3 flex shrink-0 items-center gap-2 sm:gap-3 xl:order-4">
          {cartSlot}
          <MobileNavMenu items={NAV} storeName={storeName} />
        </div>
      </div>
    </header>
  );
}

export function StoreFooter({
  storeName,
  description,
  phone,
  whatsapp,
  instagram,
  email,
}: {
  storeName: string;
  description: string;
  phone: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
}) {
  const policyLinks = [
    ["الأسئلة الشائعة", "/faq"],
    ["الشروط والأحكام", "/terms"],
    ["سياسة الخصوصية", "/privacy"],
    ["سياسة الدفع", "/payment-policy"],
    ["سياسة التوصيل", "/delivery-policy"],
    ["الطلبات المخصّصة", "/custom-orders-policy"],
    ["الاسترجاع", "/refund-policy"],
  ] as const;

  return (
    <footer className="mt-auto border-t border-white/10 bg-navy text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr_1fr] lg:px-8 lg:py-14">
        <div className="max-w-md">
          <Link href="/" className="inline-flex rounded-sm text-xl font-bold tracking-tight transition hover:text-cyan-300 focus-visible:outline-white">{storeName}</Link>
          <p className="mt-3 text-sm leading-7 text-white/65">{description}</p>
          <TopLink href="/products" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-navy transition hover:bg-cyan-50 focus-visible:outline-white">
            تصفّح المنتجات <span aria-hidden="true">←</span>
          </TopLink>
        </div>
        <div>
          <h2 className="text-sm font-semibold">تواصل معنا</h2>
          <ul className="mt-4 space-y-3 text-sm text-white/75">
            {phone ? <li><a className="inline-flex min-h-9 items-center gap-2 transition hover:text-white focus-visible:outline-white" href={`tel:${phone.replace(/[^\d+]/g, "")}`}><ContactIcon kind="phone" /><span>اتصل بنا</span></a></li> : null}
            {whatsapp ? <li><a className="inline-flex min-h-9 items-center gap-2 transition hover:text-white focus-visible:outline-white" href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><ContactIcon kind="whatsapp" /><span>راسلنا عبر واتساب</span></a></li> : null}
            {instagram ? <li><a className="inline-flex min-h-9 items-center gap-2 transition hover:text-white focus-visible:outline-white" href={instagram} target="_blank" rel="noreferrer"><ContactIcon kind="instagram" /><span>تابعنا على إنستغرام</span></a></li> : null}
            {email ? <li><a className="inline-flex min-h-9 items-center gap-2 transition hover:text-white focus-visible:outline-white" href={`mailto:${email}`}><ContactIcon kind="email" /><span>راسلنا بالبريد</span></a></li> : null}
            {!phone && !whatsapp && !instagram && !email ? <li className="text-white/55">بيانات التواصل ستظهر هنا.</li> : null}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold">معلومات تهمك</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-white/65">
            {policyLinks.map(([label, href]) => <li key={href}><Link className="inline-flex min-h-8 items-center transition hover:text-white focus-visible:outline-white" href={href}>{label}</Link></li>)}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-white/45 sm:px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>{storeName}</span>
          <span>منتجات مصممة بعناية، وتجربة شراء واضحة من البداية حتى التوصيل.</span>
        </div>
      </div>
    </footer>
  );
}

function ContactIcon({ kind }: { kind: "phone" | "whatsapp" | "instagram" | "email" }) {
  const paths = {
    phone: <path d="M5 3.8h3l1.5 4-2 1.5a15 15 0 0 0 7.2 7.2l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 3 6a2 2 0 0 1 2-2.2Z" />,
    whatsapp: <><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.5 2 2 3.5 4 4l1-1 2 1c-.5 2-2 2.5-4 2-3-1-5-3-5-5 0-1 .5-1.5 2-2l1 1.5-1 1.5" /></>,
    instagram: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.8" r=".7" fill="currentColor" stroke="none" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0">{paths[kind]}</svg>;
}
