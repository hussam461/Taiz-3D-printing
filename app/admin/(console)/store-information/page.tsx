import { saveStoreSettings } from "@/lib/admin/actions";
import { SaveChangesForm } from "@/components/admin/save-changes-form";
import { createServerSupabase } from "@/lib/supabase/server";
import { PageHeader } from "@/components/admin/ui";
import { publicMediaUrl } from "@/lib/storage/public-url";
const input = "mt-1.5 min-h-11 w-full min-w-0 rounded-xl border border-border bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15";
export default async function Page() {
  const supabase = await createServerSupabase();
  const { data } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
  const logoUrl = publicMediaUrl(data?.logo_path ?? null, "store-assets");
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="المحتوى" title="معلومات المتجر" description="أدر هوية المتجر والنصوص التي تظهر للعملاء في الموقع." />
      <SaveChangesForm action={saveStoreSettings} successMessage="تم حفظ هوية المتجر." title="هوية المتجر" description="الاسم والشعار اللذان يظهران في شريط الموقع العلوي." buttonLabel="حفظ التعديلات">
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
            <label className="block text-sm font-semibold">اسم المتجر<input name="store_name" defaultValue={data?.store_name ?? "Taiz 3D Printing"} placeholder="Taiz 3D Printing" className={input} /></label>
            <div className="rounded-2xl border border-border bg-white p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2"><p className="text-sm font-semibold text-text">الشعار <span className="font-normal text-muted">اختياري</span></p><span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${logoUrl ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-muted"}`}>{logoUrl ? "تم رفع شعار" : "بدون شعار"}</span></div>
              <label className="mt-2 block text-xs font-medium text-text">{logoUrl ? "اختيار شعار بديل" : "اختيار شعار"}
                <input name="logo_image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1.5 block min-h-11 w-full min-w-0 cursor-pointer rounded-xl border border-border bg-white p-1.5 text-xs text-muted file:me-2 file:min-h-9 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:text-xs file:font-semibold file:text-primary" />
              </label>
              <p className="mt-1 text-[11px] leading-5 text-muted">JPG أو PNG أو WebP، حتى 5MB. اختيار ملف جديد يستبدل الشعار الحالي.</p>
              {logoUrl ? <label className="mt-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-rose-50 px-3 text-xs font-medium text-rose-700"><input type="checkbox" name="remove_logo_image" className="h-4 w-4 accent-rose-600" />حذف الشعار الحالي</label> : null}
            </div>
            <label className="block text-sm font-semibold sm:col-span-2">وصف المتجر <span className="font-normal text-muted">اختياري</span><span className="mt-1 block text-xs font-normal text-muted">يظهر في تذييل الموقع.</span><textarea name="description" defaultValue={data?.description ?? ""} rows={3} placeholder="منصة يمنية للطباعة ثلاثية الأبعاد..." className={`${input} resize-y`} /></label>
          </div>
      </SaveChangesForm>

      <SaveChangesForm action={saveStoreSettings} successMessage="تم حفظ النص الاحتياطي للصفحة الرئيسية." title="مقدمة الصفحة الرئيسية" description="هذا نص احتياطي للبانر. لا يظهر ما دامت هناك شريحة منشورة؛ يظهر عند عدم وجود شرائح منشورة، مثلًا بعد حذفها أو إلغاء نشرها." buttonLabel="حفظ التعديلات">
          <div className="grid gap-4"><label className="text-sm font-semibold">العنوان الرئيسي<input name="hero_headline" defaultValue={data?.hero_headline ?? ""} placeholder="نصنع أفكارك بدقة" className={input} /></label><label className="text-sm font-semibold">الوصف التوضيحي<textarea name="hero_description" defaultValue={data?.hero_description ?? ""} rows={3} placeholder="اطلب منتجاتك المطبوعة حسب احتياجك..." className={`${input} resize-y`} /></label></div>
      </SaveChangesForm>
    </div>
  );
}
