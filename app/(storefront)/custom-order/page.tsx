import { getStorefrontContext } from "@/lib/queries/storefront";

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
      <path d="M20.5 3.5A11.85 11.85 0 0 0 12.05 0C5.5 0 .18 5.32.18 11.87c0 2.1.55 4.15 1.6 5.96L.08 24l6.34-1.66a11.9 11.9 0 0 0 5.62 1.43h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.17-1.23-6.15-3.42-8.4ZM12.06 21.7h-.01a9.83 9.83 0 0 1-5.02-1.37l-.36-.21-3.76.98 1-3.66-.23-.38a9.82 9.82 0 0 1-1.5-5.19C2.18 6.45 6.6 2.03 12.05 2.03c2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.42 9.87-9.86 9.87Zm5.41-7.4c-.3-.15-1.78-.88-2.05-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.67-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.53-.08-.15-.68-1.64-.93-2.25-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.53.07-.8.38-.28.3-1.05 1.03-1.05 2.52s1.08 2.92 1.23 3.12c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" />
    </svg>
  );
}

const steps = [
  ["شارك فكرتك", "أرسل وصفًا مختصرًا لما تريد طباعته أو أرفق صورة/تصميمًا في المحادثة."],
  ["نراجع التفاصيل", "نراجع الفكرة وإمكانية التنفيذ والخامة المناسبة، ثم نوضح لك أي تفاصيل لازمة."],
  ["نؤكد السعر والمدة", "يتم الاتفاق على السعر ومدة الإنتاج وطريقة التسليم قبل بدء التنفيذ."],
] as const;

export default async function CustomOrderPage() {
  const { contact } = await getStorefrontContext();
  const wa = contact.whatsapp?.replace(/\D/g, "");
  const text = encodeURIComponent("مرحبًا، أريد طلب طباعة ثلاثية الأبعاد مخصّصة.");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-navy p-6 text-white md:p-10">
        <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl" aria-hidden="true" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-medium text-accent">تصنيع حسب فكرتك</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight md:text-5xl">حوّل فكرتك إلى قطعة مطبوعة ثلاثيًا</h1>
          <p className="mt-5 max-w-xl leading-8 text-white/75">
            لديك فكرة أو تصميم أو صورة وتحتاج إلى تنفيذها؟ تواصل معنا عبر واتساب، وسنراجع التفاصيل معك ونقترح طريقة التنفيذ المناسبة.
          </p>
          {wa ? (
            <a
              href={`https://wa.me/${wa}?text=${text}`}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-3 rounded-lg bg-[#25D366] px-5 py-3 font-semibold text-white transition hover:bg-[#1fbd5b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <WhatsAppIcon />
              ابدأ محادثة عبر واتساب
            </a>
          ) : (
            <p className="mt-7 rounded-lg border border-white/20 bg-white/5 p-4 text-sm text-white/80">
              سيتم تفعيل التواصل عبر واتساب بعد إضافة رقم الواتساب من لوحة التحكم.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" aria-label="خطوات الطلب المخصص">
        {steps.map(([title, description], index) => (
          <article key={title} className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{index + 1}</span>
              <h2 className="font-semibold">{title}</h2>
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">{description}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 rounded-2xl border border-border bg-surface p-6 md:grid-cols-[1fr_auto] md:p-8">
        <div>
          <h2 className="text-xl font-semibold">ما الذي يمكنك إرساله؟</h2>
          <p className="mt-3 max-w-2xl leading-7 text-muted">
            أرسل وصفًا للفكرة، صورة مرجعية، رسمًا، أو ملف تصميم جاهز. الطلبات المخصصة لا تُسعّر تلقائيًا من السلة؛ يتم تحديد السعر والتفاصيل بعد مراجعة الطلب.
          </p>
          <ul className="mt-5 grid gap-3 text-sm text-text sm:grid-cols-2">
            <li className="rounded-lg bg-bg p-3">فكرة أو وصف للقطعة</li>
            <li className="rounded-lg bg-bg p-3">صورة أو رسم مرجعي</li>
            <li className="rounded-lg bg-bg p-3">ملف تصميم جاهز</li>
            <li className="rounded-lg bg-bg p-3">الخامة واللون المطلوبان</li>
          </ul>
        </div>
        <div className="flex items-center justify-center rounded-xl bg-bg p-6 text-primary" aria-hidden="true">
          <svg viewBox="0 0 96 96" className="h-24 w-24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 20h34l18 18v38H22V20Z" />
            <path d="M56 20v20h18M32 55h32M32 66h22" />
            <path d="m42 37 4 4 8-9" />
          </svg>
        </div>
      </section>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 text-sm leading-7 text-text">
        <strong>ملاحظة:</strong> هذا المسار مخصص للطلبات التي تحتاج مراجعة وتسعيرًا يدويًا. لا يتم اعتبار الطلب مؤكدًا أو بدء التصنيع قبل الاتفاق معك على السعر والتفاصيل.
      </section>
    </div>
  );
}
