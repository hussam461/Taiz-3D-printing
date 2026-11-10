import { HomepageSlidesManager } from "@/components/admin/homepage-slides-manager";
import { PageHeader } from "@/components/admin/ui";
import { createServerSupabase } from "@/lib/supabase/server";
import { publicMediaUrl } from "@/lib/storage/public-url";

export default async function HomepageSlidesPage() {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase.from("homepage_slides").select("*").order("sort_order", { ascending: true });
  const slides = (data ?? []).map((slide) => ({
    id: slide.id,
    image_path: slide.image_path ?? "",
    title: slide.title,
    description: slide.description,
    href: slide.href,
    is_published: slide.is_published,
    sort_order: slide.sort_order,
    image_url: publicMediaUrl(slide.image_path, "store-assets"),
  }));
  return <div className="mx-auto max-w-5xl space-y-6">
    <PageHeader eyebrow="المحتوى" title="شرائح الصفحة الرئيسية" description="أضف حتى 8 صور رئيسية، رتب ظهورها، واكتب عنوانًا أو وصفًا ورابطًا عند الحاجة. المقاس الموصى به للبانر 1920 × 750 بكسل." />
    {error ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950"><h2 className="font-semibold">تحديث قاعدة البيانات مطلوب</h2><p className="mt-1">لم يتعرف المشروع على جدول المعرض بعد. شغّل ملف التحديث المحلي <code dir="ltr">supabase/migrations/20260928_homepage_slides.sql</code> من SQL Editor في Supabase، ثم أعد تحميل هذه الصفحة. لم يتطلب المعرض إنشاء Storage bucket جديدًا؛ سيستخدم <code dir="ltr">store-assets</code> الموجود.</p></div> : <>
      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-6 text-blue-950">تظهر الشرائح المنشورة في الصفحة الرئيسية. ارفع صورة أفقية بمقاس موصى به 1920 × 750 بكسل (نسبة 2.56:1). تملأ الصورة البانر على كل الشاشات؛ لذلك تُقص الأطراف قليلًا على الجوال. اجعل العنصر الأساسي في منتصف الصورة، واكتب عنوانًا أو وصفًا عند الحاجة، واستخدم الأسهم لترتيب الشرائح.</div>
      <HomepageSlidesManager slides={slides} />
    </>}
  </div>;
}
