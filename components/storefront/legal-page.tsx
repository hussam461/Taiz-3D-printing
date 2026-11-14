import Link from "next/link";
import { getLegalPage } from "@/lib/queries/storefront";
import { getLegalPageTemplate, isOriginalSeedLegalBody, parseLegalSections, serializeLegalSections } from "@/lib/content/legal-pages";

function renderInlineBold(text: string) {
  const parts: { bold: boolean; value: string }[] = [];
  const boldPattern = /\*\*(.+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = boldPattern.exec(text)) !== null) {
    if (match.index > cursor) parts.push({ bold: false, value: text.slice(cursor, match.index) });
    parts.push({ bold: true, value: match[1] });
    cursor = boldPattern.lastIndex;
  }

  if (cursor < text.length) parts.push({ bold: false, value: text.slice(cursor) });
  if (parts.length === 0) parts.push({ bold: false, value: text });

  return parts.map((part, index) => part.bold
    ? <strong key={index} className="font-bold text-text">{part.value}</strong>
    : <span key={index}>{part.value}</span>);
}

function LegalParagraph({ text }: { text: string }) {
  const chunks: { type: "text" | "heading"; value: string }[] = [];
  const headingPattern = /##(?!#)\s*([^\n]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(text)) !== null) {
    const beforeHeading = text.slice(cursor, match.index).trim();
    if (beforeHeading) chunks.push({ type: "text", value: beforeHeading });
    chunks.push({ type: "heading", value: match[1].trim() });
    cursor = headingPattern.lastIndex;
  }

  const remaining = text.slice(cursor).trim();
  if (remaining) chunks.push({ type: "text", value: remaining });
  if (chunks.length === 0) chunks.push({ type: "text", value: text });

  return <>{chunks.map((chunk, index) => chunk.type === "heading"
    ? <h3 key={index} className="pt-2 text-base font-bold leading-7 text-text md:text-lg">{chunk.value}</h3>
    : <p key={index} className="whitespace-pre-wrap">{renderInlineBold(chunk.value)}</p>)}</>;
}

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
    <main className="mx-auto max-w-5xl space-y-7 pb-12 sm:space-y-9">
      <header className="relative isolate overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-primary to-cyan-800 px-5 py-5 text-white shadow-md shadow-primary/10 sm:px-8 sm:py-7 lg:px-10 lg:py-8">
        <div aria-hidden="true" className="pointer-events-none absolute -end-12 -top-16 -z-10 h-48 w-48 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-cyan-200"><span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />معلومات المتجر</span>
          <h1 className="mt-3 text-xl font-bold leading-tight tracking-tight sm:text-2xl lg:text-3xl">{pageTitle}</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/80 sm:text-base">{summary}</p>
        </div>
      </header>

      {sections.length > 0 ? (
        <article className="space-y-4">
          {sections.map((section, index) => {
            const sectionNumber = sections.slice(0, index + 1).filter((item) => item.title.trim()).length;
            return (
              <section key={`${section.title}-${index}`} id={`legal-section-${index + 1}`} className="scroll-mt-24 rounded-2xl border border-border bg-white p-5 shadow-sm transition-shadow hover:shadow-md md:p-8">
                <div className={section.title.trim() ? "flex items-start gap-4" : ""}>
                  {section.title.trim() ? <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{sectionNumber}</span> : null}
                  <div className="min-w-0 flex-1">
                    {section.title.trim() ? <h2 className="text-lg font-bold text-text md:text-xl">{section.title}</h2> : null}
                    <div className={`${section.title.trim() ? "mt-3 " : ""}space-y-3 text-sm leading-8 text-text md:text-base`}>
                      {section.paragraphs.map((paragraph, paragraphIndex) => <LegalParagraph key={paragraphIndex} text={paragraph} />)}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </article>
      ) : (
        <section className="rounded-3xl border border-dashed border-border bg-white p-8 text-center shadow-sm"><span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary" aria-hidden="true">i</span><h2 className="mt-4 font-semibold">المحتوى قيد الإعداد</h2><p className="mt-2 text-sm leading-6 text-muted">يمكنك التواصل معنا مباشرة لأي استفسار في الوقت الحالي.</p><Link href="/contact" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">صفحة التواصل</Link></section>
      )}
      <footer className="flex flex-col gap-4 rounded-3xl bg-gradient-to-br from-primary to-[#075985] p-5 text-sm leading-7 text-white shadow-lg shadow-primary/10 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div><strong className="font-semibold">هل تحتاج إلى مساعدة؟</strong><span className="ms-1 text-white/80">فريق المتجر جاهز للإجابة عن استفسارك.</span></div><Link href="/contact" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-slate-50">تواصل معنا <span className="ms-2" aria-hidden="true">←</span></Link></footer>
    </main>
  );
}
