import { getStorefrontContext } from "@/lib/queries/storefront";
import { createPublicPageMetadata } from "@/lib/public-metadata";

export const metadata = createPublicPageMetadata(
  "تواصل معنا",
  "تواصل مع متجر Taiz 3D Printing للاستفسار عن المنتجات والطلبات المخصصة عبر الهاتف أو واتساب أو البريد الإلكتروني.",
  "/contact",
);

type ContactKind = "phone" | "whatsapp" | "instagram" | "email";

function ContactIcon({ kind }: { kind: ContactKind }) {
  const paths = {
    phone: <><path d="M6.5 3.5h3l1.6 4-2 1.5a14 14 0 0 0 5.9 5.9l1.5-2 4 1.6v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z" /></>,
    whatsapp: <><path d="M20 11.5a8 8 0 0 1-11.8 7L4 20l1.5-4A8 8 0 1 1 20 11.5Z" /><path d="M9 8.5c.5 2 2 3.5 4 4l1-1 2 1c-.5 2-2 2.5-4 2-3-1-5-3-5-5 0-1 .5-1.5 2-2l1 1.5-1 1.5" /></>,
    instagram: <><rect x="4" y="4" width="16" height="16" rx="4" /><circle cx="12" cy="12" r="3.5" /><circle cx="17.5" cy="6.8" r=".7" fill="currentColor" stroke="none" /></>,
    email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">{paths[kind]}</svg>;
}

function ContactCard({ kind, title, href, action, external = false }: { kind: ContactKind; title: string; href: string; action: string; external?: boolean }) {
  return <article className="flex min-w-0 flex-col items-center rounded-2xl border border-border bg-white p-3 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md sm:p-5">
    <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11"><ContactIcon kind={kind} /></span>
    <h2 className="mt-2 text-xs font-bold text-text sm:mt-3 sm:text-base">{title}</h2>
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-1 rounded-xl bg-primary px-2 text-[11px] font-semibold leading-4 text-white transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:mt-4 sm:min-h-11 sm:gap-2 sm:px-3 sm:text-sm">
      {action}<span aria-hidden="true">{external ? "↗" : "←"}</span>
    </a>
  </article>;
}

export default async function ContactPage() {
  const { contact, store } = await getStorefrontContext();
  const phoneDigits = contact.phone?.replace(/[^\d+]/g, "") ?? "";
  const whatsappDigits = contact.whatsapp?.replace(/\D/g, "") ?? "";
  const hasContact = Boolean(phoneDigits || whatsappDigits || contact.instagram || contact.email);

  return <div className="mx-auto max-w-5xl space-y-7 sm:space-y-9">
    <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-primary to-cyan-800 px-5 py-5 text-white shadow-md shadow-primary/10 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
      <div aria-hidden="true" className="pointer-events-none absolute -end-12 -top-16 -z-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />نحن هنا لمساعدتك</span>
        <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight sm:text-2xl lg:text-3xl">تواصل مع {store.store_name}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">اختر الطريقة المناسبة للتواصل معنا، وسنسعد بمساعدتك.</p>
      </div>
    </header>

    {hasContact ? <section aria-label="طرق التواصل" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {phoneDigits ? <ContactCard kind="phone" title="اتصال هاتفي" href={`tel:${phoneDigits}`} action="اتصل بنا" /> : null}
      {whatsappDigits ? <ContactCard kind="whatsapp" title="واتساب" href={`https://wa.me/${whatsappDigits}?text=${encodeURIComponent(contact.whatsapp_message || "السلام عليكم، أريد الاستفسار عن منتجاتكم.")}`} action="راسلنا" external /> : null}
      {contact.instagram ? <ContactCard kind="instagram" title="إنستغرام" href={contact.instagram} action="تابع حسابنا" external /> : null}
      {contact.email ? <ContactCard kind="email" title="البريد الإلكتروني" href={`mailto:${contact.email}`} action="راسلنا بالبريد" /> : null}
    </section> : <section className="rounded-2xl border border-dashed border-border bg-white px-5 py-12 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-100 text-muted"><ContactIcon kind="email" /></span><h2 className="mt-4 font-semibold">قنوات التواصل غير متاحة حاليًا</h2><p className="mt-2 text-sm leading-6 text-muted">ستظهر معلومات التواصل هنا عند إضافتها من إدارة المتجر.</p></section>}
  </div>;
}
