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
  const updatedAt = page?.updated_at ? new Intl.DateTimeFormat("ar-YE-u-nu-latn", { dateStyle: "long" }).format(new Date(page.updated_at)) : null;

  return (
    <main className="mx-auto max-w-6xl space-y-7 pb-10">
      <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-l from-blue-50 via-white to-white p-6 shadow-sm md:p-10">
        <p className="text-sm font-semibold text-primary">معلومات Taiz 3D Printing</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-text md:text-4xl">{pageTitle}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted md:text-base">{summary}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted"><span>آخر تحديث للمحتوى: {updatedAt ?? "المعلومات الحالية للمتجر"}</span><Link href="/contact" className="font-semibold text-primary underline-offset-4 hover:underline">تواصل معنا بشأن هذه الصفحة</Link></div>
      </header>

      {sections.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <article className="order-2 space-y-4 lg:order-1">
            {sections.map((section, index) => (
              <section key={`${section.title}-${index}`} id={`legal-section-${index + 1}`} className="scroll-mt-24 rounded-2xl border border-border bg-white p-5 shadow-sm md:p-7">
                <h2 className="text-lg font-bold text-text md:text-xl">{section.title}</h2>
                <div className="mt-3 space-y-3 text-sm leading-8 text-muted md:text-base">
                  {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="whitespace-pre-wrap">{paragraph}</p>)}
                </div>
              </section>
            ))}
          </article>
          <aside className="order-1 h-fit rounded-2xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:order-2">
            <h2 className="font-bold">في هذه الصفحة</h2>
            <nav aria-label="أقسام الصفحة" className="mt-3 space-y-1">
              {sections.map((section, index) => <a key={`${section.title}-${index}`} href={`#legal-section-${index + 1}`} className="block rounded-lg px-3 py-2 text-sm leading-6 text-muted transition hover:bg-blue-50 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{section.title}</a>)}
            </nav>
          </aside>
        </div>
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-white p-8 text-center"><h2 className="font-semibold">المحتوى قيد الإعداد</h2><p className="mt-2 text-sm leading-6 text-muted">يمكنك التواصل معنا مباشرة لأي استفسار في الوقت الحالي.</p><Link href="/contact" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">صفحة التواصل</Link></section>
      )}
      <footer className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm leading-7 text-blue-950"><strong className="font-semibold">هل تحتاج إلى مساعدة؟</strong><span className="ms-1">فريق المتجر جاهز للإجابة عن استفسارك.</span><Link href="/contact" className="ms-2 font-semibold underline underline-offset-4">تواصل معنا</Link></footer>
    </main>
  );
}
