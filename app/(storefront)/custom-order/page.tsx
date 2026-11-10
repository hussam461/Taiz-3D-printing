import Image from "next/image";
import { getCustomOrderContent, getStorefrontContext } from "@/lib/queries/storefront";
import { publicMediaUrl } from "@/lib/storage/public-url";

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M20.5 3.5A11.85 11.85 0 0 0 12.05 0C5.5 0 .18 5.32.18 11.87c0 2.1.55 4.15 1.6 5.96L.08 24l6.34-1.66a11.9 11.9 0 0 0 5.62 1.43h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.17-1.23-6.15-3.42-8.4ZM12.06 21.7h-.01a9.83 9.83 0 0 1-5.02-1.37l-.36-.21-3.76.98 1-3.66-.23-.38a9.82 9.82 0 0 1-1.5-5.19C2.18 6.45 6.6 2.03 12.05 2.03c2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.42 9.87-9.86 9.87Zm5.41-7.4c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.64-.93-2.25-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.03-1.05 2.52s1.08 2.92 1.23 3.12c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" />
    </svg>
  );
}

export default async function CustomOrderPage() {
  const [{ contact, store }, content] = await Promise.all([getStorefrontContext(), getCustomOrderContent()]);
  const wa = contact.whatsapp?.replace(/\D/g, "");
  const text = encodeURIComponent(content.whatsapp_message);
  const customOrderImageUrl = publicMediaUrl(store.custom_order_image_path, "store-assets");

  return (
    <div className="mx-auto max-w-6xl space-y-6 sm:space-y-8">
      <section className="relative isolate overflow-hidden rounded-2xl border border-border bg-navy text-white shadow-xl shadow-navy/10 sm:rounded-3xl lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.85fr)] lg:items-stretch">
        <div className="pointer-events-none absolute -end-24 -top-28 -z-10 h-72 w-72 rounded-full bg-primary/25 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col justify-center p-5 sm:p-8 lg:p-10">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent sm:text-sm"><span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />{content.eyebrow}</p>
          <h1 className="mt-4 max-w-2xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">{content.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/75 sm:mt-5 sm:text-base sm:leading-8">
            {content.description}
          </p>
          {wa ? (
            <a
              href={`https://wa.me/${wa}?text=${text}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1fbd5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:mt-7 sm:w-auto sm:gap-3 sm:text-base"
            >
              <WhatsAppIcon />
              ابدأ محادثة عبر واتساب
            </a>
          ) : (
            <p className="mt-6 rounded-xl border border-white/20 bg-white/5 p-3 text-sm leading-6 text-white/80 sm:mt-7 sm:p-4">
              سيتم تفعيل التواصل عبر واتساب بعد إضافة رقم الواتساب من لوحة التحكم.
            </p>
          )}
        </div>
        <div className="relative min-h-56 overflow-hidden border-t border-white/10 bg-white/5 lg:min-h-0 lg:border-t-0 lg:border-s">
          {customOrderImageUrl ? <Image src={customOrderImageUrl} alt="" fill sizes="(max-width: 1023px) 100vw, 42vw" unoptimized className="object-cover object-center" /> : <div className="flex h-full min-h-56 items-center justify-center text-accent" aria-hidden="true">
            <svg viewBox="0 0 72 72" className="h-24 w-24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m36 7 25 14v29L36 64 11 50V21L36 7Z" />
              <path d="m11 21 25 15 25-15M36 36v28M24 14l25 15M48 14 23 29M25 42h22M25 49h22" />
            </svg>
          </div>}
          <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-navy/10 to-transparent" aria-hidden="true" />
          <div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/15 bg-navy/70 p-3 backdrop-blur-sm lg:inset-x-6 lg:bottom-6">
            <p className="text-sm font-semibold">من الفكرة إلى التنفيذ</p>
            <p className="mt-1 text-xs leading-5 text-white/70">{content.response_time}</p>
          </div>
        </div>
      </section>

      <section aria-label="خطوات الطلب المخصص">
        <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">1 / البداية</p><h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{content.process_title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{content.process_description}</p></div>
          <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/5 text-primary sm:grid" aria-hidden="true">↓</span>
        </div>
        <div className="grid gap-3 sm:gap-4 md:grid-cols-3">
          {content.steps.map((step, index) => (
            <article key={`${step.title}-${index}`} className="group relative rounded-2xl border border-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 sm:p-6 md:min-h-48">
              {index < content.steps.length - 1 ? <span className="absolute -end-3 top-12 z-10 hidden h-px w-6 bg-primary/25 md:block" aria-hidden="true" /> : null}
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-bold text-white shadow-lg shadow-primary/20">{index + 1}</span>
                <span className="text-2xl font-bold text-slate-200 transition group-hover:text-primary/30">{index === 0 ? "→" : index === 1 ? "↗" : "✓"}</span>
              </div>
              <h3 className="mt-5 text-base font-bold sm:text-lg">{step.title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="bg-navy p-5 text-white sm:p-8 lg:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">2 / جهّز التفاصيل</p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{content.materials_title}</h2>
            <p className="mt-3 text-sm leading-7 text-white/70">{content.materials_description}</p>
          </div>
          <ul className="grid gap-2 p-4 sm:grid-cols-2 sm:gap-3 sm:p-8 lg:p-10">
            {content.materials.map((item, index) => <li key={item} className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-bg px-4 py-3 text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>{item}</li>)}
          </ul>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#075985] p-5 text-white shadow-xl shadow-primary/15 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -end-16 -top-20 h-56 w-56 rounded-full border-[24px] border-white/10" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/70">3 / جاهز نبدأ؟</p>
            <p className="mt-3 text-sm leading-7 text-white/85"><strong className="font-bold text-white">قبل بدء التنفيذ:</strong> {content.note}</p>
          </div>
          {wa ? <a href={`https://wa.me/${wa}?text=${text}`} target="_blank" rel="noreferrer" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-lg transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"><WhatsAppIcon /> ابدأ الآن</a> : null}
        </div>
      </section>
    </div>
  );
}
