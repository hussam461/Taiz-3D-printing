import { SaveChangesForm } from "@/components/admin/save-changes-form";
import { PageHeader } from "@/components/admin/ui";
import { saveCustomOrderContent } from "@/lib/admin/actions";
import { getCustomOrderContent } from "@/lib/queries/storefront";

const input = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";

export default async function CustomOrderAdminPage() {
  const content = await getCustomOrderContent();
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader eyebrow="المحتوى" title="صفحة الطلب المخصص" description="عدّل النصوص والخطوات والقائمة التي يراها العميل، مع بقاء الطلب والتواصل عبر واتساب." />
      <SaveChangesForm action={saveCustomOrderContent} successMessage="تم حفظ صفحة الطلب المخصص." title="المقدمة والتواصل" description="هذه النصوص تظهر في الجزء الرئيسي من الصفحة ورسالة واتساب الجاهزة." buttonLabel="حفظ المقدمة">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold">الشارة القصيرة<input name="eyebrow" required maxLength={80} defaultValue={content.eyebrow} className={input} /></label>
          <label className="text-sm font-semibold">وقت الرد أو الوعد للعميل<input name="response_time" required maxLength={160} defaultValue={content.response_time} className={input} /></label>
          <label className="text-sm font-semibold sm:col-span-2">العنوان الرئيسي<input name="title" required maxLength={120} defaultValue={content.title} className={input} /></label>
          <label className="text-sm font-semibold sm:col-span-2">الوصف<textarea name="description" required maxLength={500} rows={4} defaultValue={content.description} className={`${input} resize-y`} /></label>
          <label className="text-sm font-semibold sm:col-span-2">رسالة واتساب الجاهزة<textarea name="whatsapp_message" required maxLength={300} rows={3} defaultValue={content.whatsapp_message} className={`${input} resize-y`} /></label>
        </div>
      </SaveChangesForm>

      <SaveChangesForm action={saveCustomOrderContent} successMessage="تم حفظ خطوات الطلب." title="خطوات الطلب" description="اكتب ثلاث خطوات واضحة. تظهر مرقمة للعميل بالترتيب نفسه." buttonLabel="حفظ الخطوات">
        <div className="grid gap-4 md:grid-cols-3">
          {content.steps.map((step, index) => <fieldset key={index} className="rounded-2xl border border-border bg-bg p-4">
            <legend className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">الخطوة {index + 1}</legend>
            <label className="mt-2 block text-sm font-semibold">العنوان<input name={`step_${index + 1}_title`} required maxLength={80} defaultValue={step.title} className={input} /></label>
            <label className="mt-3 block text-sm font-semibold">الوصف<textarea name={`step_${index + 1}_description`} required maxLength={240} rows={5} defaultValue={step.description} className={`${input} resize-y`} /></label>
          </fieldset>)}
        </div>
        <label className="block text-sm font-semibold">عنوان القسم<input name="process_title" required maxLength={100} defaultValue={content.process_title} className={input} /></label>
        <label className="block text-sm font-semibold">وصف القسم<textarea name="process_description" required maxLength={240} rows={2} defaultValue={content.process_description} className={`${input} resize-y`} /></label>
      </SaveChangesForm>

      <SaveChangesForm action={saveCustomOrderContent} successMessage="تم حفظ متطلبات الطلب." title="المعلومات المطلوبة من العميل" description="تحكم في العناصر التي توضح للعميل ما يمكن إرساله في المحادثة." buttonLabel="حفظ المتطلبات">
        <label className="block text-sm font-semibold">عنوان القسم<input name="materials_title" required maxLength={100} defaultValue={content.materials_title} className={input} /></label>
        <label className="block text-sm font-semibold">الوصف<textarea name="materials_description" required maxLength={500} rows={4} defaultValue={content.materials_description} className={`${input} resize-y`} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          {content.materials.slice(0, 4).map((item, index) => <label key={index} className="text-sm font-semibold">العنصر {index + 1}<input name={`material_${index + 1}`} required maxLength={100} defaultValue={item} className={input} /></label>)}
        </div>
        <label className="block text-sm font-semibold">ملاحظة ما قبل التنفيذ<textarea name="note" required maxLength={500} rows={3} defaultValue={content.note} className={`${input} resize-y`} /></label>
      </SaveChangesForm>
    </div>
  );
}
