import { getStorefrontContext } from "@/lib/queries/storefront";

export default async function ContactPage() {
  const { contact, store } = await getStorefrontContext();
  return (
    <div className="mx-auto max-w-xl space-y-3">
      <h1 className="text-2xl font-semibold">تواصل مع {store.store_name}</h1>
      {contact.phone ? <p>الهاتف: {contact.phone}</p> : null}
      {contact.whatsapp ? (
        <p>
          واتساب:{" "}
          <a className="text-primary" href={`https://wa.me/${contact.whatsapp.replace(/\D/g, "")}`}>
            {contact.whatsapp}
          </a>
        </p>
      ) : null}
      {contact.instagram ? (
        <p>
          إنستغرام:{" "}
          <a className="text-primary" href={contact.instagram}>
            {contact.instagram}
          </a>
        </p>
      ) : null}
      {contact.email ? <p>البريد: {contact.email}</p> : null}
      {!contact.phone && !contact.whatsapp && !contact.instagram && !contact.email ? (
        <p className="text-muted">بيانات التواصل تُدار من لوحة التحكم.</p>
      ) : null}
    </div>
  );
}
