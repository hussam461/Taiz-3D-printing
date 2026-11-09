"use server";

import { createOrderFromCheckout } from "@/lib/orders/create-order";
import { createServiceClient } from "@/lib/supabase/service";
import { ALLOWED_PROOF_TYPES, MAX_PROOF_BYTES } from "@/types/domain";

const stagingPathPattern = /^checkout-staging\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i;
const proofExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function uploadCheckoutProof(formData: FormData) {
  const value = formData.get("proof");
  if (!(value instanceof File) || value.size === 0) {
    return { ok: false as const, error: "اختر صورة أو ملف PDF لإثبات التحويل." };
  }
  if (!(ALLOWED_PROOF_TYPES as readonly string[]).includes(value.type)) {
    return { ok: false as const, error: "نوع الملف غير مدعوم. ارفع صورة JPG أو PNG أو WebP أو ملف PDF." };
  }
  if (value.size > MAX_PROOF_BYTES) {
    return { ok: false as const, error: "حجم الملف أكبر من 8 ميغابايت. اختر ملفًا أصغر." };
  }

  const path = `checkout-staging/${crypto.randomUUID()}.${proofExtensions[value.type]}`;
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.storage.from("payment-proofs").upload(path, Buffer.from(await value.arrayBuffer()), {
      contentType: value.type,
      upsert: false,
    });
    if (error) {
      console.error("Checkout proof staging upload failed", { error });
      return { ok: false as const, error: "تعذر رفع الإثبات الآن. تحقق من الاتصال وحاول مرة أخرى." };
    }
    return { ok: true as const, path, fileName: value.name.slice(0, 180), fileType: value.type, fileSize: value.size };
  } catch (error) {
    console.error("Checkout proof staging upload failed", { error });
    return { ok: false as const, error: "تعذر رفع الإثبات الآن. تحقق من الاتصال وحاول مرة أخرى." };
  }
}

export async function discardCheckoutProof(path: string) {
  if (!stagingPathPattern.test(path)) return;
  try {
    const { error } = await createServiceClient().storage.from("payment-proofs").remove([path]);
    if (error) console.error("Checkout proof staging cleanup failed", { error });
  } catch (error) {
    console.error("Checkout proof staging cleanup failed", { error });
  }
}

export async function submitCheckoutAction(formData: FormData) {
  const rawItems = formData.get("items");
  let items: unknown = [];
  try {
    items = JSON.parse(String(rawItems ?? "[]"));
  } catch {
    return { ok: false as const, error: "بيانات السلة غير صالحة" };
  }

  return createOrderFromCheckout(
    {
      idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
      items,
      customerName: String(formData.get("customerName") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      customerEmail: String(formData.get("customerEmail") ?? ""),
      deliveryAreaId: String(formData.get("deliveryAreaId") ?? ""),
      address: String(formData.get("address") ?? ""),
      deliveryNotes: String(formData.get("deliveryNotes") ?? ""),
      paymentCurrency: String(formData.get("paymentCurrency") ?? ""),
      paymentAccountId: String(formData.get("paymentAccountId") ?? ""),
    },
    String(formData.get("proofPath") ?? ""),
    String(formData.get("proofFileName") ?? ""),
  );
}
