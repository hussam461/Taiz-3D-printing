import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { PageHeader } from "@/components/admin/ui";
import { createServerSupabase } from "@/lib/supabase/server";
import { isOriginalSeedLegalBody, LEGAL_PAGE_TEMPLATES, serializeLegalSections } from "@/lib/content/legal-pages";
import { saveLegalPage } from "@/lib/admin/actions";

const inputClass = "w-full rounded-xl border border-border bg-white px-4 py-3 text-sm shadow-sm transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10";

export default async function LegalPagesAdmin() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("legal_pages").select("slug, title, body, updated_at").order("slug");
  const existing = new Map((data ?? []).map((page) => [page.slug, page]));
  const pages = [
    ...LEGAL_PAGE_TEMPLATES.map((template) => {
      const stored = existing.get(template.slug);
      existing.delete(template.slug);
      const storedBody = stored?.body?.trim() ?? "";
      const isTemplate = !storedBody || isOriginalSeedLegalBody(template.slug, storedBody);
      return {
        ...template,
        title: stored?.title || template.title,
        body: isTemplate ? serializeLegalSections(template.sections) : storedBody,
        updatedAt: stored?.updated_at ?? null,
        isTemplate,
      };
    }),
    ...(data ?? []).filter((page) => existing.has(page.slug)).map((page) => ({
      slug: page.slug,
      title: page.title,
      summary: "محتوى قانوني إضافي محفوظ في قاعدة بيانات المتجر.",
      body: page.body ?? "",
      updatedAt: page.updated_at,
      isTemplate: false,
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <PageHeader eyebrow="المحتوى" title="الصفحات والسياسات" description="راجع صفحات المتجر، حرر محتواها، واحفظ كل صفحة على حدة. عند عدم وجود محتوى محفوظ، تظهر مسودة جاهزة قابلة للتحرير بدل صفحة فارغة." />
      {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">تعذر تحميل الصفحات المحفوظة. نعرض القوالب المتاحة مؤقتًا؛ لن تُحفظ التعديلات حتى يعود اتصال قاعدة البيانات.</p> : null}
      <div className="flex items-center justify-between text-sm text-muted"><span>{pages.length} صفحات</span><span>كل صفحة تُحفظ بشكل مستقل</span></div>
      <div className="space-y-5">
        {pages.map((page) => (
          <section key={page.slug} className="overflow-hidden rounded-3xl border border-border bg-surface shadow-sm">
            <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border bg-white px-5 py-5 md:px-7">
              <div><p className="text-xs font-semibold tracking-wide text-primary">/{page.slug}</p><h2 className="mt-1 text-xl font-bold">{page.title}</h2><p className="mt-2 text-sm leading-6 text-muted">{page.summary}</p></div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${page.isTemplate ? "bg-amber-50 text-amber-900" : "bg-green-50 text-green-800"}`}>{page.isTemplate ? "مسودة جاهزة للتحرير" : "محتوى محفوظ"}</span>
            </header>
            <ActionForm action={saveLegalPage} successMessage="تم حفظ الصفحة القانونية." className="space-y-4 p-5 md:p-7">
              <input type="hidden" name="slug" value={page.slug} />
              <label className="block text-sm font-semibold">عنوان الصفحة<input name="title" required maxLength={160} defaultValue={page.title} className={`${inputClass} mt-2`} /></label>
              <label className="block text-sm font-semibold">محتوى الصفحة<span className="mt-1 block text-xs font-normal leading-5 text-muted">العناوين التي تبدأ بـ ## تظهر كعناوين أقسام. اترك سطرًا فارغًا بين الفقرات.</span><textarea name="body" required rows={Math.max(14, Math.min(24, page.body.split("\n").length + 2))} defaultValue={page.body} className={`${inputClass} mt-2 min-h-80 resize-y leading-8`} dir="auto" /></label>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted">{page.updatedAt ? `آخر حفظ: ${new Intl.DateTimeFormat("ar-YE-u-nu-latn", { dateStyle: "medium" }).format(new Date(page.updatedAt))}` : "لم تُحفظ هذه الصفحة بعد."}</p><SubmitButton className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover" pendingLabel="جارٍ الحفظ...">حفظ الصفحة</SubmitButton></div>
            </ActionForm>
          </section>
        ))}
      </div>
    </div>
  );
}
