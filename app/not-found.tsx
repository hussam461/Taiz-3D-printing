import Link from "next/link";

export default function NotFound() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">الصفحة غير موجودة</h1>
      <Link href="/" className="mt-4 inline-block text-primary">
        العودة للرئيسية
      </Link>
    </div>
  );
}
