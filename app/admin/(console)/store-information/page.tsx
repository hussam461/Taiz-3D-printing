import { saveStoreSettings } from "@/lib/admin/actions";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader, SectionCard } from "@/components/admin/ui";
import Image from "next/image";
import { publicMediaUrl } from "@/lib/storage/public-url";
const input = "mt-1 w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/15";
export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const logoUrl = publicMediaUrl(data?.logo_path ?? null, "store-assets");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="المحتوى" title="معلومات المتجر" description="أدر هوية المتجر والنصوص التي تظهر للعملاء في الموقع." />
      <ActionForm action={saveStoreSettings} className="space-y-6">
        <SectionCard title="هوية المتجر" description="الاسم والشعار اللذان يظهران في شريط الموقع العلوي.">
          <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_220px] sm:items-start">
            <div className="space-y-4">
              <label className="block text-sm font-medium">اسم المتجر<input name="store_name" defaultValue={data?.store_name ?? "Taiz 3D Printing"} placeholder="Taiz 3D Printing" className={input} /></label>
              <label className="block text-sm font-medium">شعار الموقع <span className="font-normal text-muted">اختياري</span><span className="mt-1 block text-xs font-normal leading-5 text-muted">يفضل شعار أفقي بخلفية شفافة بصيغة PNG أو WebP. الحد الأقصى 5MB. سيظهر داخل مساحة متوازنة في ترويسة الموقع.</span><input name="logo_image" type="file" accept="image/jpeg,image/png,image/webp" className={`${input} file:me-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary`} /></label>
            </div>
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-border bg-white p-4">
              <div className="flex max-w-full items-center gap-2.5">
                {logoUrl ? <span className="flex h-10 w-14 shrink-0 items-center justify-center"><Image src={logoUrl} alt="" width={160} height={64} unoptimized className="max-h-full max-w-full object-contain" /></span> : null}
                <span className="truncate text-base font-bold text-navy">{data?.store_name || "Taiz 3D Printing"}</span>
              </div>
            </div>
          </div>
          <label className="mt-5 block text-sm font-medium">وصف المتجر <span className="font-normal text-muted">اختياري</span><span className="mt-1 block text-xs font-normal text-muted">وصف قصير يظهر في تذييل الموقع.</span><textarea name="description" defaultValue={data?.description ?? ""} rows={4} placeholder="منصة يمنية للطباعة ثلاثية الأبعاد..." className={input} /></label>
        </SectionCard>
        <SectionCard title="مقدمة الصفحة الرئيسية" description="العنوان والوصف اللذان يراهما العميل أولًا عند زيارة المتجر.">
          <div className="grid gap-4"><label className="text-sm font-medium">العنوان الرئيسي<input name="hero_headline" defaultValue={data?.hero_headline ?? ""} placeholder="نصنع أفكارك بدقة" className={input} /></label><label className="text-sm font-medium">الوصف التوضيحي<textarea name="hero_description" defaultValue={data?.hero_description ?? ""} rows={4} placeholder="اطلب منتجاتك المطبوعة حسب احتياجك..." className={input} /></label></div>
        </SectionCard>
        <SubmitButton pendingLabel="جارٍ الحفظ..." className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover">حفظ معلومات المتجر</SubmitButton>
      </ActionForm>
    </div>
  );
}
