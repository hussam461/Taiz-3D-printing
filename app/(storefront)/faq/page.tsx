import { getFaq } from "@/lib/queries/storefront";

export default async function FaqPage() {
  const items = await getFaq();
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div><h1 className="text-2xl font-semibold">الأسئلة الشائعة</h1><p className="mt-2 text-sm text-muted">اضغط على أي سؤال لعرض إجابته.</p></div>
      {items.length === 0 ? (
        <p className="text-muted">لا توجد أسئلة منشورة بعد.</p>
      ) : (
        items.map((item) => (
          <details key={item.id} className="rounded-xl border border-border bg-surface p-4">
            <summary className="cursor-pointer font-medium">{item.question}</summary>
            <p className="mt-2 text-muted">{item.answer}</p>
          </details>
        ))
      )}
    </div>
  );
}
