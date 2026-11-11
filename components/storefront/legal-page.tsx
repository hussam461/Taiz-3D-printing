import Link from "next/link";
import { getLegalPage } from "@/lib/queries/storefront";
import { getLegalPageTemplate, isOriginalSeedLegalBody, parseLegalSections, serializeLegalSections } from "@/lib/content/legal-pages";

export default async function LegalRoute({ title, slug }: { title: string; slug: string }) {
  const [page, template] = await Promise.all([getLegalPage(slug), Promise.resolve(getLegalPageTemplate(slug))]);
  const pageTitle = page?.title?.trim() || template?.title || title;
  const storedBody = page?.body?.trim() ?? "";
  const body = template && (!storedBody || isOriginalSeedLegalBody(slug, storedBody))
    ? serializeLegalSections(template.sections)
    : storedBody;
  const sections = parseLegalSections(body, template);
  const summary = template?.summary ?? "معلومات وإرشادات تخص استخدام متجر Taiz 3D Printing.";

  return (
    <main className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-border bg-white p-6 shadow-sm md:p-10">
        <div className="absolute -end-10 -top-16 h-48 w-48 rounded-full border-[18px] border-primary/10" aria-hidden="true" />
        <div className="relative max-w-3xl">
          <div className="flex items-center gap-3 text-sm font-semibold text-primary"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M6 3.75h9l3 3V20.25H6V3.75Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M15 3.75v3h3M9 11h6M9 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg></span><span>معلومات المتجر</span></div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-text md:text-5xl">{pageTitle}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-8 text-muted md:text-base">{summary}</p>
          <Link href="/contact" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">تواصل معنا <span aria-hidden="true">←</span></Link>
        </div>
      </header>

      {sections.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <article className="order-2 space-y-4 lg:order-1">
            {sections.map((section, index) => (
              <section key={`${section.title}-${index}`} id={`legal-section-${index + 1}`} className="scroll-mt-24 rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{index + 1}</span>
                  <div className="min-w-0 flex-1"><h2 className="text-lg font-bold text-text md:text-xl">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-8 text-muted md:text-base">
                  {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="whitespace-pre-wrap">{paragraph}</p>)}
                </div>
                  </div>
                </div>
              </section>
            ))}
          </article>
          <aside className="order-1 h-fit overflow-hidden rounded-2xl bg-navy text-white shadow-lg shadow-navy/10 lg:sticky lg:top-6 lg:order-2">
            <div className="border-b border-white/10 px-5 py-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">دليل الصفحة</p><h2 className="mt-2 font-bold">في هذه الصفحة</h2></div>
            <nav aria-label="أقسام الصفحة" className="space-y-1 p-3">
              {sections.map((section, index) => <a key={`${section.title}-${index}`} href={`#legal-section-${index + 1}`} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm leading-6 text-white/70 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"><span className="text-xs font-bold text-accent">{index + 1}</span>{section.title}</a>)}
            </nav>
          </aside>
        </div>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-white p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">i</span><h2 className="mt-4 font-semibold">المحتوى قيد الإعداد</h2><p className="mt-2 text-sm leading-6 text-muted">يمكنك التواصل معنا مباشرة لأي استفسار في الوقت الحالي.</p><Link href="/contact" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">صفحة التواصل</Link></section>
      )}
      <footer className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-primary to-[#075985] p-5 text-sm leading-7 text-white shadow-lg shadow-primary/10 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><strong className="font-semibold">هل تحتاج إلى مساعدة؟</strong><span className="ms-1 text-white/80">فريق المتجر جاهز للإجابة عن استفسارك.</span></div><Link href="/contact" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-50">تواصل معنا <span className="ms-2" aria-hidden="true">←</span></Link></footer>
    </main>
  );
}
