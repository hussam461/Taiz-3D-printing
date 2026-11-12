"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { canTransition } from "@/lib/orders/transitions";
import { PAYMENT_CURRENCIES } from "@/types/domain";
import { hasValidProductImageSignature, parseProductForm, productImageExtension, validateProductImageMetadata } from "@/lib/validation/product";
import { parseDeliveryFee } from "@/lib/validation/delivery-fee";
import { whatsappNumber } from "@/lib/formatting/whatsapp";

async function isImageReferencedByHistoricalOrder(
  supabase: SupabaseClient,
  productId: string,
  storagePath: string,
) {
  const { data: items, error } = await supabase
    .from("order_items")
    .select("snapshot")
    .eq("product_id", productId);
  if (error) {
    console.error("Could not verify historical product image references", { productId, storagePath, error });
    return true;
  }
  return (items ?? []).some((item) => {
    const snapshot = item.snapshot as { image?: unknown } | null;
    return snapshot?.image === storagePath;
  });
}

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");
  if (!email || !password) {
    return { ok: false as const, error: "أدخل البريد الإلكتروني وكلمة المرور." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false as const, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى." };
  }

  // A Supabase account is not automatically an administrator. Keep the same
  // message as invalid credentials and discard sessions for unapproved users.
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    await supabase.auth.signOut();
    return { ok: false as const, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { ok: false as const, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى." };
  }

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAdmin() {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

export async function updateOrderStatus(orderId: string, toStatus: string, note?: string) {
  const admin = await requireAdmin();
  const supabase = await createServerSupabase();
  const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (!order) return { ok: false as const, error: "الطلب غير موجود" };
  if (toStatus === "completed") {
    return { ok: false as const, error: "استخدم إجراء تأكيد التسليم لتسجيل التسليم والتحصيل بأمان." };
  }
  if (!canTransition(order.order_status, toStatus)) {
    return { ok: false as const, error: "انتقال الحالة غير مسموح" };
  }
  if (toStatus === "in_production" && order.payment_status !== "proof_approved") {
    return { ok: false as const, error: "اعتمد إثبات العربون أولًا؛ سيبدأ التجهيز تلقائيًا بعد الاعتماد." };
  }
  const { error: updateError } = await supabase
    .from("orders")
    .update({ order_status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", orderId);
  if (updateError) {
    console.error("Order status update failed", { orderId, toStatus, error: updateError });
    return { ok: false as const, error: "تعذر تحديث حالة الطلب. حدّث الصفحة ثم حاول مرة أخرى." };
  }
  const { error: historyError } = await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: order.order_status,
    to_status: toStatus,
    changed_by: admin.user.id,
    note: note ?? null,
  });
  if (historyError) console.error("Order status history could not be recorded", { orderId, toStatus, error: historyError });
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true as const };
}

export async function deleteTerminalOrder(orderId: string) {
  await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)) {
    return { ok: false as const, error: "رقم الطلب غير صالح." };
  }

  const supabase = createServiceClient();
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, order_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError || !order) return { ok: false as const, error: "تعذر العثور على الطلب. حدّث الصفحة وحاول مجددًا." };
  if (order.order_status !== "completed" && order.order_status !== "cancelled") {
    return { ok: false as const, error: "يمكن حذف الطلبات المكتملة أو الملغاة فقط." };
  }

  const { data: proofs, error: proofsError } = await supabase
    .from("payment_proofs")
    .select("storage_path")
    .eq("order_id", orderId);
  if (proofsError) {
    console.error("Order payment proofs could not be loaded before deletion", { orderId, error: proofsError });
    return { ok: false as const, error: "تعذر التحقق من ملفات إثبات الدفع؛ لم يُحذف الطلب." };
  }

  const paths = [...new Set((proofs ?? []).map((proof) => proof.storage_path).filter(Boolean))];
  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from("payment-proofs").remove(paths);
    if (storageError) {
      console.error("Order payment proof files could not be removed", { orderId, error: storageError });
      return { ok: false as const, error: "تعذر حذف ملفات إثبات الدفع؛ لم يُحذف سجل الطلب." };
    }
  }

  const { data: deletedOrder, error: deleteError } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .in("order_status", ["completed", "cancelled"])
    .select("id")
    .maybeSingle();
  if (deleteError || !deletedOrder) {
    console.error("Order deletion failed after proof file cleanup", { orderId, error: deleteError });
    return { ok: false as const, error: "تعذر حذف سجل الطلب بعد تنظيف ملفات الإثبات. حدّث الصفحة وحاول مجددًا." };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function completeOrderDelivery(orderId: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("admin_complete_order_delivery", { p_order_id: orderId });
  if (error) {
    console.error("Order delivery and balance collection could not be recorded", { orderId, error });
    if (error.code === "PGRST202" || error.code === "PGRST204") {
      return { ok: false as const, error: "تأكيد التسليم والتحصيل غير مفعّل في قاعدة البيانات بعد. شغّل تحديث قاعدة البيانات المطلوب ثم حاول مجددًا." };
    }
    if (error.message.includes("order is not in production")) return { ok: false as const, error: "لا يمكن إكمال الطلب قبل اعتماد إثبات العربون وبدء التجهيز." };
    if (error.message.includes("deposit proof is not approved")) return { ok: false as const, error: "اعتمد إثبات العربون أولًا قبل تسجيل تحصيل المتبقي." };
    if (error.message.includes("no tracked balance")) return { ok: false as const, error: "لا يوجد مبلغ متبقٍ مستحق للتسجيل في هذا الطلب." };
    if (error.message.includes("order not found")) return { ok: false as const, error: "الطلب غير موجود. حدّث الصفحة وتحقق منه." };
    return { ok: false as const, error: "تعذر تأكيد التسليم. حدّث الصفحة وتحقق من حالة الطلب ثم حاول مجددًا." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true as const };
}

export async function reviewProof(proofId: string, decision: "approved" | "rejected", reason?: string, sendWhatsApp = false, customerMessage?: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { data: proof, error: proofLoadError } = await supabase.from("payment_proofs").select("order_id, orders(customer_name, customer_phone, reference)").eq("id", proofId).maybeSingle();
  if (proofLoadError || !proof) return { ok: false as const, error: "تعذر العثور على إثبات الدفع. حدّث الصفحة وحاول مرة أخرى." };
  const { error } = await supabase.rpc("admin_review_order_payment_proof", {
    p_proof_id: proofId,
    p_decision: decision,
    p_reason: decision === "rejected" ? reason?.trim() ?? "" : null,
  });
  if (error) {
    console.error("Payment proof review failed", { proofId, decision, error });
    if (error.message.includes("proof already reviewed")) return { ok: false as const, error: "تمت مراجعة هذا الإثبات بالفعل. حدّث الصفحة للاطلاع على الحالة الجديدة." };
    if (error.message.includes("order is closed")) return { ok: false as const, error: "لا يمكن اعتماد إثبات طلب مكتمل أو ملغي." };
    if (error.message.includes("not authorized")) return { ok: false as const, error: "انتهت صلاحية الجلسة أو لا تملك صلاحية مراجعة الإثبات. سجّل الدخول مجددًا." };
    if (error.code === "PGRST202" || error.code === "PGRST204") return { ok: false as const, error: "تحديث قاعدة البيانات المطلوب غير مفعّل بعد. شغّل migration تشغيل الطلبات وإثباتات الدفع ثم أعد المحاولة." };
    return { ok: false as const, error: "تعذر مراجعة الإثبات وتحديث الطلب. لم يُسجّل القرار؛ أعد المحاولة." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${proof.order_id}`);
  if (sendWhatsApp) {
    const order = Array.isArray(proof.orders) ? proof.orders[0] : proof.orders;
    const phone = order?.customer_phone ? whatsappNumber(String(order.customer_phone)) : "";
    if (phone) {
      const reasonText = reason?.trim().slice(0, 1200) ?? "";
      const customText = customerMessage?.trim().slice(0, 1200) ?? "";
      const message = decision === "rejected"
        ? `السلام عليكم ${order.customer_name}، بخصوص طلبك ${order.reference}: تعذر اعتماد إثبات الدفع.${reasonText ? ` سبب الرفض: ${reasonText}.` : ""} يرجى إعادة إرسال الإثبات حتى نتمكن من متابعة طلبك.`
        : customText || `السلام عليكم ${order.customer_name}، تم اعتماد إثبات العربون لطلبك ${order.reference}، وبدأنا تجهيز الطلب. شكرًا لثقتك بنا.`;
      redirect(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`);
    }
  }
  return { ok: true as const };
}

export async function deletePaymentProof(proofId: string) {
  await requireAdmin();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(proofId)) {
    return { ok: false as const, error: "رقم الإثبات غير صالح." };
  }

  const supabase = await createServerSupabase();
  const { data: proof, error: loadError } = await supabase.from("payment_proofs").select("id, order_id, storage_path, status").eq("id", proofId).maybeSingle();
  if (loadError || !proof) return { ok: false as const, error: "تعذر العثور على الإثبات. حدّث الصفحة وحاول مجددًا." };
  if (proof.status === "pending") return { ok: false as const, error: "لا يمكن حذف إثبات ما زال بانتظار المراجعة." };

  const { error: storageError } = await supabase.storage.from("payment-proofs").remove([proof.storage_path]);
  if (storageError) {
    console.error("Payment proof file deletion failed", { proofId, error: storageError });
    return { ok: false as const, error: "تعذر حذف ملف الإثبات من التخزين؛ لم يُحذف سجل الإثبات." };
  }

  const { data: deletedProof, error: deleteError } = await createServiceClient()
    .from("payment_proofs")
    .delete()
    .eq("id", proofId)
    .in("status", ["approved", "rejected"])
    .select("id")
    .maybeSingle();
  if (deleteError || !deletedProof) {
    console.error("Payment proof record deletion failed", { proofId, error: deleteError });
    return { ok: false as const, error: "حُذف الملف لكن تعذر حذف سجل الإثبات. أعد المحاولة." };
  }

  return { ok: true as const };
}

export async function deletePaymentProofs(formData: FormData) {
  await requireAdmin();
  const proofIds = [...new Set(formData.getAll("proofIds").map((value) => String(value)))];
  if (proofIds.length === 0 || proofIds.length > 500 || proofIds.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
    return { ok: false as const, error: "حدد إثباتات صالحة للحذف (حتى 500 إثبات في المرة الواحدة)." };
  }

  const supabase = await createServerSupabase();
  const serviceSupabase = createServiceClient();
  const { data: proofs, error: loadError } = await supabase
    .from("payment_proofs")
    .select("id, order_id, storage_path, status")
    .in("id", proofIds)
    .in("status", ["approved", "rejected"]);
  if (loadError || !proofs || proofs.length !== proofIds.length) {
    return { ok: false as const, error: "تعذر حذف بعض الإثباتات أو تغيرت حالتها. حدّث الصفحة وحاول مجددًا." };
  }

  const batchSize = 50;
  for (let offset = 0; offset < proofs.length; offset += batchSize) {
    const batch = proofs.slice(offset, offset + batchSize);
    const batchIds = batch.map((proof) => proof.id);
    const { error: storageError } = await supabase.storage.from("payment-proofs").remove(batch.map((proof) => proof.storage_path));
    if (storageError) {
      console.error("Bulk payment proof file deletion failed", { deletedCount: offset, error: storageError });
      return { ok: false as const, error: offset ? `حُذف ${offset} إثباتًا، وتعذر حذف الدفعة التالية. حدّث الصفحة لمراجعة ما تبقى.` : "تعذر حذف ملفات الإثباتات من التخزين؛ لم تُحذف سجلاتها." };
    }

    const { data: deletedProofs, error: deleteError } = await serviceSupabase
      .from("payment_proofs")
      .delete()
      .in("id", batchIds)
      .in("status", ["approved", "rejected"])
      .select("id");
    if (deleteError || deletedProofs?.length !== batchIds.length) {
      console.error("Bulk payment proof record deletion failed", { deletedCount: offset, batchSize: batch.length, error: deleteError });
      return { ok: false as const, error: `تعذر حذف سجلات الدفعة بعد حذف ملفاتها. حدّث الصفحة وتحقق من الإثباتات المتبقية.` };
    }
  }

  return { ok: true as const };
}

type ProductActionState =
  | { ok: true; productId: string; created: boolean }
  | { ok: false; error: string; fieldErrors?: import("@/lib/validation/product").ProductFieldErrors };

export async function createProductImageUploadUrl(mimeType: string, size: number) {
  try {
    const { user } = await requireAdmin();
    const metadataError = validateProductImageMetadata({ type: mimeType, size });
    if (metadataError) return { ok: false as const, error: metadataError };
    const path = `product-uploads/${user.id}/${crypto.randomUUID()}.${productImageExtension(mimeType)}`;
    const supabase = await createServerSupabase();
    const { data, error } = await supabase.storage.from("product-images").createSignedUploadUrl(path);
    if (error || !data?.token) {
      console.error("Product image upload URL creation failed", { error });
      return { ok: false as const, error: "تعذر تجهيز رفع الصورة. تحقق من الاتصال ثم حاول مرة أخرى." };
    }
    return { ok: true as const, path, token: data.token };
  } catch (error) {
    const digest = (error as { digest?: string } | null)?.digest;
    if (digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Product image upload URL creation threw", { error });
    return { ok: false as const, error: "تعذر تجهيز رفع الصورة. تحقق من الاتصال ثم حاول مرة أخرى." };
  }
}

export async function discardProductImageUpload(path: string) {
  try {
    const { user } = await requireAdmin();
    const prefix = `product-uploads/${user.id}/`;
    if (!path.startsWith(prefix) || !/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(path.slice(prefix.length))) {
      return { ok: false as const };
    }
    const supabase = await createServerSupabase();
    const { data: references, error: referenceError } = await supabase.from("product_images").select("id").eq("storage_path", path).limit(1);
    if (referenceError || references?.length) return { ok: false as const };
    const { error } = await supabase.storage.from("product-images").remove([path]);
    if (error) console.error("Temporary product image cleanup failed", { path, error });
    return { ok: !error } as const;
  } catch (error) {
    const digest = (error as { digest?: string } | null)?.digest;
    if (digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Temporary product image cleanup threw", { error });
    return { ok: false as const };
  }
}

export async function upsertProduct(_previousState: ProductActionState | null, formData: FormData): Promise<ProductActionState> {
  const admin = await requireAdmin();
  try {
  const id = String(formData.get("id") ?? "");
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { ok: false, error: "راجع الحقول المحددة ثم حاول الحفظ مرة أخرى.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;
  const uploadedImagePath = String(formData.get("uploaded_product_image_path") ?? "").trim();
  const suppliedFiles = [...formData.getAll("product_image"), ...formData.getAll("product_images")];
  if (suppliedFiles.some((value) => value instanceof File && value.size > 0)) {
    return { ok: false, error: "تعذر إرسال ملف الصورة بالطريقة الجديدة. حدّث الصفحة ثم حاول مرة أخرى.", fieldErrors: { image: "أعد اختيار الصورة بعد تحديث الصفحة." } };
  }
  if (uploadedImagePath) {
    const prefix = `product-uploads/${admin.user.id}/`;
    if (!uploadedImagePath.startsWith(prefix) || !/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i.test(uploadedImagePath.slice(prefix.length))) {
      return { ok: false, error: "مسار الصورة غير صالح. اختر الصورة مجددًا.", fieldErrors: { image: "أعد اختيار الصورة." } };
    }
  }

  const supabase = await createServerSupabase();
  let uploadedImageMimeType: string | null = null;
  if (uploadedImagePath) {
    const { data: storedImage, error } = await supabase.storage.from("product-images").download(uploadedImagePath);
    if (error || !storedImage) {
      console.error("Uploaded product image could not be verified", { error });
      return { ok: false, error: "لم يكتمل رفع الصورة. حاول الحفظ مرة أخرى لإعادة الرفع.", fieldErrors: { image: "تعذر التحقق من الصورة المرفوعة." } };
    }
    uploadedImageMimeType = uploadedImagePath.endsWith(".jpg") ? "image/jpeg" : uploadedImagePath.endsWith(".png") ? "image/png" : "image/webp";
    if (validateProductImageMetadata({ type: uploadedImageMimeType, size: storedImage.size })) {
      return { ok: false, error: "الصورة المرفوعة تتجاوز الحجم المسموح أو صيغتها غير مدعومة.", fieldErrors: { image: "اختر صورة أصغر بصيغة JPG أو PNG أو WebP." } };
    }
    if (!hasValidProductImageSignature(uploadedImageMimeType, new Uint8Array(await storedImage.arrayBuffer()))) {
      return { ok: false, error: "محتوى الملف لا يطابق صيغة الصورة. اختر صورة صالحة.", fieldErrors: { image: "الملف ليس صورة صالحة." } };
    }
  }
  let existingImage: { id: string; storage_path: string; is_main: boolean } | null = null;
  if (id) {
    const { data: product, error } = await supabase.from("products").select("id, slug").eq("id", id).maybeSingle();
    if (error || !product) return { ok: false, error: "تعذر العثور على المنتج. حدّث الصفحة وحاول مرة أخرى." };
    const { data: images, error: imageError } = await supabase.from("product_images").select("id, storage_path, is_main").eq("product_id", id).order("is_main", { ascending: false }).order("created_at").limit(1);
    if (imageError) {
      console.error("Could not load product image before update", { productId: id, error: imageError });
      return { ok: false, error: "تعذر تحميل صورة المنتج. حاول مرة أخرى." };
    }
    existingImage = images?.[0] ?? null;
  }
  if (data.isActive && !uploadedImagePath && !existingImage) return { ok: false, error: "أضف صورة للمنتج قبل نشره.", fieldErrors: { image: "الصورة مطلوبة للمنتج المنشور." } };
  if (id && data.isActive && !uploadedImagePath && existingImage && !existingImage.is_main) {
    const { error } = await supabase.from("product_images").update({ is_main: true, sort_order: 0 }).eq("id", existingImage.id).eq("product_id", id);
    if (error) {
      console.error("Could not promote legacy product image to the current image", { productId: id, error });
      return { ok: false, error: "تعذر اعتماد صورة المنتج للنشر. أعد المحاولة أو تواصل مع الدعم." };
    }
  }

  const slug = id ? String(formData.get("current_slug") ?? "") : `product-${crypto.randomUUID().slice(0, 8)}`;
  if (id && !slug) return { ok: false, error: "تعذر تحديد رابط المنتج الحالي. أعد فتح الصفحة وحاول مرة أخرى." };
  const payload = {
    name: data.name, slug, description: data.description, category_id: data.categoryId,
    base_price_old_yer: data.basePriceOldYer, discount_percent: data.discountPercent,
    is_active: data.isActive, is_featured: data.isActive && data.isFeatured,
    specifications: data.specifications, seo_title: data.seoTitle, seo_description: data.seoDescription,
    updated_at: new Date().toISOString(),
  };
  let productId = id;
  let created = false;
  if (id) {
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) {
      console.error("Product update failed", { productId: id, error });
      return { ok: false, error: error.code === "23505" ? "اسم الرابط مستخدم بالفعل. أعد فتح المنتج أو تواصل مع الدعم." : "تعذر حفظ التعديلات. تحقق من اتصالك وحاول مرة أخرى." };
    }
  } else {
    const { data: product, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error || !product) {
      console.error("Product creation failed", { error });
      return { ok: false, error: error?.code === "23503" ? "التصنيف لم يعد متاحًا. اختر تصنيفًا آخر." : error?.code === "23505" ? "تعذر إنشاء رابط فريد للمنتج. حاول مرة أخرى." : "تعذر إنشاء المنتج. تحقق من اتصالك وصلاحيات الحساب ثم حاول مرة أخرى." };
    }
    productId = product.id;
    created = true;
  }

  if (uploadedImagePath && uploadedImageMimeType) {
    const path = uploadedImagePath;
    let imageWriteError: { message: string; code?: string } | null = null;
    if (existingImage) {
      const { error } = await supabase.from("product_images").update({ storage_path: path, is_main: true, sort_order: 0 }).eq("id", existingImage.id).eq("product_id", productId);
      imageWriteError = error;
    } else {
      const { error } = await supabase.from("product_images").insert({ product_id: productId, storage_path: path, is_main: true, sort_order: 0, alt_text: null });
      imageWriteError = error;
    }
    if (imageWriteError) {
      console.error("Product image record write failed", { productId, error: imageWriteError });
      if (created) await supabase.from("products").delete().eq("id", productId);
      return { ok: false, error: "تم حفظ بيانات المنتج لكن تعذر ربط الصورة. أعد المحاولة أو تواصل مع الدعم.", fieldErrors: { image: "تعذر ربط الصورة بالمنتج." } };
    }
    if (existingImage && existingImage.storage_path !== path && !existingImage.storage_path.startsWith("/") && !/^https?:\/\//i.test(existingImage.storage_path) && !(await isImageReferencedByHistoricalOrder(supabase, productId, existingImage.storage_path))) {
      const { error } = await supabase.storage.from("product-images").remove([existingImage.storage_path]);
      if (error) console.error("Old product image cleanup failed", { productId, error });
    }
  }
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true, productId, created };
  } catch (error) {
    const digest = (error as { digest?: string } | null)?.digest;
    if (digest?.startsWith("NEXT_REDIRECT")) throw error;
    console.error("Product save action threw", { productId: String(formData.get("id") ?? "new"), error });
    return { ok: false, error: "حدث خطأ مؤقت أثناء حفظ المنتج. بياناتك ما زالت في النموذج؛ حاول مرة أخرى." };
  }
}

export async function deactivateProduct(id: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  await supabase.from("products").update({ is_active: false }).eq("id", id);
  revalidatePath("/admin/products");
  return { ok: true as const };
}

export async function toggleProductPublication(id: string, currentlyActive: boolean) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  if (!currentlyActive) {
    const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", id).eq("is_main", true);
    if (count !== 1) return { ok: false as const, error: "أضف صورة للمنتج من صفحة التعديل قبل نشره." };
  }
  const { error } = await supabase.from("products").update({ is_active: !currentlyActive, is_featured: currentlyActive ? false : undefined, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false as const, error: `تعذر ${currentlyActive ? "إيقاف نشر" : "إعادة نشر"} المنتج.` };
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath("/products");
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { data: product } = await supabase
    .from("products")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();
  if (!product) return { ok: false as const, error: "المنتج غير موجود" };

  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false as const, error: "تعذر حذف المنتج" };

  const paths = (images ?? []).map((image) => image.storage_path).filter(Boolean);
  const removablePaths: string[] = [];
  for (const path of paths) {
    if (!path.startsWith("/") && !/^https?:\/\//i.test(path) && !(await isImageReferencedByHistoricalOrder(supabase, id, path))) {
      removablePaths.push(path);
    }
  }
  if (removablePaths.length > 0) await supabase.storage.from("product-images").remove(removablePaths);
  revalidatePath("/admin/products");
  revalidatePath("/products");
  return { ok: true as const };
}

export async function saveSimpleRow(table: string, formData: FormData) {
  await requireAdmin();
  const allowed = new Set([
    "categories",
    "colors",
    "materials",
    "delivery_areas",
    "payment_accounts",
    "faq_items",
    "homepage_benefits",
    "legal_pages",
  ]);
  if (!allowed.has(table)) return { ok: false as const, error: "جدول غير مسموح" };
  const supabase = await createServerSupabase();
  const id = String(formData.get("id") ?? "");
  const record: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (["id", "table", "current_slug", "sort_order"].includes(key)) continue;
    if (value === "on") record[key] = true;
    else record[key] = value;
  }
  const booleanFields: Record<string, string[]> = {
    categories: ["is_active"],
    colors: ["is_active", "is_default"],
    materials: ["is_active", "is_default"],
    delivery_areas: ["is_active", "is_default"],
    payment_accounts: ["is_active"],
    faq_items: ["is_published"],
    homepage_benefits: ["is_published"],
  };
  for (const flag of booleanFields[table] ?? []) {
    record[flag] = formData.get(flag) === "on";
  }
  if (table === "categories") {
    const currentSlug = String(formData.get("current_slug") ?? "").trim();
    record.slug = id && currentSlug ? currentSlug : `category-${crypto.randomUUID().slice(0, 8)}`;
    record.description = null;
    const slug = String(record.slug ?? "").trim();
    if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false as const, error: "المسار المختصر يجب أن يكون بالإنجليزية وأرقام وشرطات فقط" };
  }
  if (table === "homepage_benefits") {
    const title = String(record.title ?? "").trim();
    const description = String(record.description ?? "").trim();
    if (!title) return { ok: false as const, error: "اكتب عنوان الميزة قبل الحفظ." };
    if (title.length > 80) return { ok: false as const, error: "اجعل عنوان الميزة 80 حرفًا أو أقل." };
    if (description.length > 240) return { ok: false as const, error: "اجعل وصف الميزة 240 حرفًا أو أقل." };
    record.title = title;
    record.description = description;
  }
  if (table === "colors") {
    const name = String(record.name ?? "").trim();
    const hexCode = String(record.hex_code ?? "").trim();
    if (!name) return { ok: false as const, error: "اكتب اسم اللون قبل الحفظ." };
    if (!/^#[0-9a-fA-F]{6}$/.test(hexCode)) return { ok: false as const, error: "اختر درجة لون صحيحة." };
    record.name = name;
    record.hex_code = hexCode.toLowerCase();
  }
  const sortableTables = new Set(["categories", "colors", "materials", "delivery_areas", "payment_accounts", "faq_items", "homepage_benefits"]);
  if (!id && sortableTables.has(table)) {
    const { data: last, error } = await supabase.from(table).select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    if (error && sortableTables.has(table)) {
      console.error("Could not generate automatic sort order", { table, error });
      return { ok: false as const, error: "تعذر تجهيز ترتيب العنصر الجديد. أعد المحاولة." };
    }
    record.sort_order = Number(last?.sort_order ?? -1) + 1;
  }
  if (table === "delivery_areas") {
    const rawFee = String(formData.get("fee_old_yer") ?? "");
    const fee = parseDeliveryFee(rawFee);
    if (fee === null) return { ok: false as const, error: "أدخل رسوم التوصيل كأرقام، ويمكن إضافة فاصل الآلاف أو عبارة «ريال قديم». لا تُدخل وصفًا نصيًا بدل المبلغ." };
    record.fee_old_yer = fee;
    // New delivery areas use the governorate only; city_area remains untouched on older rows.
    delete record.city_area;
  }
  if (table === "payment_accounts") {
    const code = String(record.currency_code);
    if (!PAYMENT_CURRENCIES.includes(code as "OLD_YER" | "NEW_YER")) {
      return { ok: false as const, error: "عملة الحساب غير مدعومة" };
    }
  }
  const defaultable = table === "colors" || table === "materials" || table === "delivery_areas";
  const wantsDefault = defaultable && record.is_default === true;
  let previousDefaultId: string | null = null;
  if (wantsDefault) {
    if (record.is_active !== true) return { ok: false as const, error: "فعّل العنصر أولًا قبل تعيينه كخيار افتراضي." };
    const { data: previous, error } = await supabase.from(table).select("id").eq("is_default", true).limit(1).maybeSingle();
    if (error) {
      console.error("Could not read the current default option", { table, error });
      return { ok: false as const, error: "تعذر التحقق من الخيار الافتراضي الحالي. أعد المحاولة." };
    }
    previousDefaultId = previous?.id ?? null;
    // Insert/update the record first without the flag, then switch the unique default safely.
    record.is_default = false;
  }

  let savedId = id;
  if (id) {
    const { error } = await supabase.from(table).update(record).eq("id", id);
    if (error) {
      console.error("Admin row update failed", { table, id, error });
      if (table === "colors" && (error.code === "PGRST204" || error.code === "42703")) {
        return { ok: false as const, error: "ميزة درجة اللون تحتاج تحديث قاعدة البيانات. طبّق ترحيل color_swatch ثم أعد الحفظ." };
      }
      return { ok: false as const, error: error.code === "23505" ? "توجد قيمة مستخدمة بالفعل. راجع البيانات وحاول مرة أخرى." : "تعذر حفظ التعديلات. تحقق من البيانات وحاول مرة أخرى." };
    }
  } else {
    const { data, error } = await supabase.from(table).insert(record).select("id").single();
    if (error || !data) {
      console.error("Admin row creation failed", { table, error });
      if (table === "colors" && (error?.code === "PGRST204" || error?.code === "42703")) {
        return { ok: false as const, error: "ميزة درجة اللون تحتاج تحديث قاعدة البيانات. طبّق ترحيل color_swatch ثم أعد الحفظ." };
      }
      return { ok: false as const, error: error?.code === "23505" ? "يوجد عنصر بهذه البيانات بالفعل." : "تعذر إنشاء العنصر. تحقق من البيانات وحاول مرة أخرى." };
    }
    savedId = data.id;
  }

  if (wantsDefault && savedId) {
    const { error: clearError } = await supabase.from(table).update({ is_default: false }).eq("is_default", true).neq("id", savedId);
    if (clearError) {
      console.error("Could not clear the previous default option", { table, savedId, error: clearError });
      await restoreSingleDefault(supabase, table, previousDefaultId);
      if (!id) await supabase.from(table).delete().eq("id", savedId);
      return { ok: false as const, error: "تعذر تبديل الخيار الافتراضي. لم يتم اعتماد خيار إضافي؛ أعد المحاولة." };
    }
    const { error: setError } = await supabase.from(table).update({ is_default: true }).eq("id", savedId);
    if (setError) {
      console.error("Could not set the selected default option", { table, savedId, error: setError });
      await restoreSingleDefault(supabase, table, previousDefaultId);
      if (!id) await supabase.from(table).delete().eq("id", savedId);
      return { ok: false as const, error: "تعذر تعيين هذا العنصر كافتراضي. أُعيد الخيار السابق إن وُجد؛ حاول مرة أخرى." };
    }
  }
  revalidatePath("/admin");
  const adminPath = table === "delivery_areas" ? "delivery" : table === "payment_accounts" ? "payment-accounts" : table === "faq_items" ? "faq" : table === "homepage_benefits" ? "homepage-benefits" : table === "legal_pages" ? "legal-pages" : table;
  revalidatePath(`/admin/${adminPath}`);
  if (table === "colors") {
    revalidatePath("/");
    revalidatePath("/products");
    revalidatePath("/products/[slug]", "page");
  }
  if (table === "homepage_benefits") revalidatePath("/");
  return { ok: true as const, id: savedId ?? undefined };
}

export async function saveCategory(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const slug = id ? String(formData.get("current_slug") ?? "").trim() : `category-${crypto.randomUUID().slice(0, 8)}`;
  const isActive = formData.get("is_active") === "on";
  if (!name || name.length > 80) return { ok: false as const, error: "اكتب اسمًا للتصنيف لا يتجاوز 80 حرفًا." };
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false as const, error: "تعذر تحديد رابط التصنيف. حدّث الصفحة وحاول مجددًا." };
  let nextSortOrder = 0;
  if (!id) {
    const { data: lastCategory, error: sortError } = await supabase.from("categories").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    if (sortError) {
      console.error("Could not determine category sort order", { error: sortError });
      return { ok: false as const, error: "تعذر تحديد ترتيب التصنيف الجديد. أعد المحاولة." };
    }
    nextSortOrder = Number(lastCategory?.sort_order ?? -1) + 1;
  }

  let current: { id: string; image_path: string | null } | null = null;
  if (id) {
    const { data, error } = await supabase.from("categories").select("id, image_path").eq("id", id).maybeSingle();
    if (error) {
      console.error("Category image migration is unavailable", { error });
      return { ok: false as const, error: "ميزة صور التصنيفات تحتاج تحديث قاعدة البيانات. طبّق ترحيل category_images ثم أعد المحاولة." };
    }
    if (!data) return { ok: false as const, error: "التصنيف غير موجود. حدّث الصفحة وحاول مجددًا." };
    current = data;
  }

  const imageValue = formData.get("category_image");
  const image = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  const removeImage = formData.get("remove_category_image") === "on";
  let uploadedPath: string | null = null;
  if (image) {
    const metadataError = validateProductImageMetadata(image);
    if (metadataError) return { ok: false as const, error: metadataError };
    const bytes = new Uint8Array(await image.arrayBuffer());
    if (!hasValidProductImageSignature(image.type, bytes)) return { ok: false as const, error: "محتوى الملف لا يطابق صورة صالحة. اختر JPG أو PNG أو WebP." };
    uploadedPath = `categories/${crypto.randomUUID()}.${productImageExtension(image.type)}`;
    const { error } = await supabase.storage.from("store-assets").upload(uploadedPath, Buffer.from(bytes), { contentType: image.type, upsert: false });
    if (error) {
      console.error("Category image upload failed", { error });
      return { ok: false as const, error: "تعذر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى." };
    }
  }

  const payload = {
    name,
    slug,
    description: null,
    is_active: isActive,
    image_path: uploadedPath ?? (removeImage ? null : current?.image_path ?? null),
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error } = id
    ? await supabase.from("categories").update(payload).eq("id", id).select("id").maybeSingle()
    : await supabase.from("categories").insert({ ...payload, sort_order: nextSortOrder }).select("id").maybeSingle();
  if (error || !saved) {
    if (uploadedPath) await supabase.storage.from("store-assets").remove([uploadedPath]);
    if (error?.code === "PGRST204" || error?.code === "42703") return { ok: false as const, error: "ميزة صور التصنيفات تحتاج تحديث قاعدة البيانات. طبّق ترحيل category_images ثم أعد المحاولة." };
    console.error("Category save failed", { error });
    return { ok: false as const, error: error?.code === "23505" ? "يوجد تصنيف بهذا الاسم أو الرابط بالفعل." : "تعذر حفظ التصنيف. تحقق من البيانات وحاول مرة أخرى." };
  }

  if ((uploadedPath || removeImage) && current?.image_path && !current.image_path.startsWith("/") && !/^https?:\/\//i.test(current.image_path)) {
    const { error: cleanupError } = await supabase.storage.from("store-assets").remove([current.image_path]);
    if (cleanupError) console.error("Replaced category image cleanup failed", { path: current.image_path, error: cleanupError });
  }
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/categories");
  return { ok: true as const, id: saved.id };
}

async function restoreSingleDefault(supabase: Awaited<ReturnType<typeof createServerSupabase>>, table: string, defaultId: string | null) {
  const { error: clearError } = await supabase.from(table).update({ is_default: false }).eq("is_default", true);
  if (clearError) console.error("Could not clear default flags during recovery", { table, error: clearError });
  if (!defaultId) return;
  const { error } = await supabase.from(table).update({ is_default: true }).eq("id", defaultId);
  if (error) console.error("Could not restore the previous default option", { table, defaultId, error });
}

export async function deleteSimpleRow(table: string, id: string) {
  await requireAdmin();
  const allowed = new Set([
    "categories",
    "colors",
    "materials",
    "delivery_areas",
    "payment_accounts",
    "faq_items",
    "homepage_benefits",
    "legal_pages",
  ]);
  if (!allowed.has(table) || !id) return { ok: false as const, error: "العنصر المطلوب غير صالح" };
  const supabase = await createServerSupabase();
  let categoryImage: string | null = null;
  if (table === "categories") {
    const { data } = await supabase.from("categories").select("image_path").eq("id", id).maybeSingle();
    categoryImage = data?.image_path ?? null;
  }
  const column = table === "legal_pages" ? "slug" : "id";
  const { error } = await supabase.from(table).delete().eq(column, id);
  if (error) {
    if (table === "categories") return { ok: false as const, error: "لا يمكن حذف التصنيف لأنه مرتبط بمنتج. عطّله بدلًا من حذفه." };
    if (table === "payment_accounts") return { ok: false as const, error: error.message.includes("حساب دفع") ? error.message : "تعذر حذف حساب الدفع. تأكد من وجود حساب نشط آخر." };
    return { ok: false as const, error: "تعذر حذف العنصر. تحقق من البيانات وحاول مرة أخرى." };
  }
  if (table === "categories" && categoryImage && !categoryImage.startsWith("/") && !/^https?:\/\//i.test(categoryImage)) {
    const { error: cleanupError } = await supabase.storage.from("store-assets").remove([categoryImage]);
    if (cleanupError) console.error("Deleted category image cleanup failed", { path: categoryImage, error: cleanupError });
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/${table === "delivery_areas" ? "delivery" : table === "payment_accounts" ? "payment-accounts" : table === "faq_items" ? "faq" : table === "homepage_benefits" ? "homepage-benefits" : table === "legal_pages" ? "legal-pages" : table}`);
  if (table === "homepage_benefits") revalidatePath("/");
  return { ok: true as const };
}

export async function saveFreeDelivery(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("free_delivery_settings").upsert({
    id: 1,
    is_enabled: formData.get("is_enabled") === "on",
    min_order_value_old_yer: Number(formData.get("min_order_value_old_yer") ?? 0),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: "تعذر حفظ إعداد التوصيل المجاني" };
  revalidatePath("/admin/offers");
  return { ok: true as const };
}

export async function saveExchangeRate(formData: FormData) {
  const admin = await requireAdmin();
  const rate = Number(formData.get("new_rial_per_old_rial"));
  if (!Number.isFinite(rate) || rate <= 0) return { ok: false as const, error: "سعر غير صالح" };
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("exchange_rates").insert({
    new_rial_per_old_rial: rate,
    created_by: admin.user.id,
  });
  if (error) return { ok: false as const, error: "تعذر حفظ سعر التحويل" };
  revalidatePath("/admin/currencies");
  return { ok: true as const };
}

export async function saveStoreSettings(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { data: current, error: currentError } = await supabase.from("store_settings").select("*").eq("id", 1).maybeSingle();
  if (currentError) return { ok: false as const, error: "تعذر تحميل إعدادات المتجر. أعد المحاولة." };
  const logoValue = formData.get("logo_image");
  const logoFile = logoValue instanceof File && logoValue.size > 0 ? logoValue : null;
  const removeLogo = formData.get("remove_logo_image") === "on";
  let uploadedLogoPath: string | null = null;
  if (logoFile) {
    const metadataError = validateProductImageMetadata(logoFile);
    if (metadataError) return { ok: false as const, error: metadataError };
    const logoBytes = new Uint8Array(await logoFile.arrayBuffer());
    if (!hasValidProductImageSignature(logoFile.type, logoBytes)) {
      return { ok: false as const, error: "محتوى الملف لا يطابق صورة صالحة. اختر JPG أو PNG أو WebP." };
    }
    uploadedLogoPath = `logo/${crypto.randomUUID()}.${productImageExtension(logoFile.type)}`;
    const { error: uploadError } = await supabase.storage.from("store-assets").upload(uploadedLogoPath, Buffer.from(logoBytes), { contentType: logoFile.type, upsert: false });
    if (uploadError) {
      console.error("Store logo upload failed", { error: uploadError });
      return { ok: false as const, error: "تعذر رفع الشعار. تحقق من الاتصال وحاول مرة أخرى." };
    }
  }
  const cardImageFields = [
    { formName: "all_products_image", removeName: "remove_all_products_image", pathKey: "all_products_image_path", prefix: "all-products", error: "تعذر رفع صورة جميع المنتجات." },
    { formName: "custom_order_image", removeName: "remove_custom_order_image", pathKey: "custom_order_image_path", prefix: "custom-order", error: "تعذر رفع صورة الطلب المخصص." },
  ] as const;
  const uploadedCardPaths: Partial<Record<(typeof cardImageFields)[number]["pathKey"], string>> = {};
  const cleanupPendingImageUploads = async () => {
    const paths = [uploadedLogoPath, ...Object.values(uploadedCardPaths)].filter((path): path is string => Boolean(path));
    if (!paths.length) return;
    const { error } = await supabase.storage.from("store-assets").remove(paths);
    if (error) console.error("Could not clean up unfinished store image uploads", { paths, error });
  };
  for (const field of cardImageFields) {
    const value = formData.get(field.formName);
    const file = value instanceof File && value.size > 0 ? value : null;
    if (!file) continue;
    const metadataError = validateProductImageMetadata(file);
    if (metadataError) {
      await cleanupPendingImageUploads();
      return { ok: false as const, error: metadataError };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!hasValidProductImageSignature(file.type, bytes)) {
      await cleanupPendingImageUploads();
      return { ok: false as const, error: "محتوى الملف لا يطابق صورة صالحة. اختر JPG أو PNG أو WebP." };
    }
    const path = `${field.prefix}/${crypto.randomUUID()}.${productImageExtension(file.type)}`;
    const { error: uploadError } = await supabase.storage.from("store-assets").upload(path, Buffer.from(bytes), { contentType: file.type, upsert: false });
    if (uploadError) {
      console.error("Storefront card image upload failed", { field: field.pathKey, error: uploadError });
      await cleanupPendingImageUploads();
      return { ok: false as const, error: field.error };
    }
    uploadedCardPaths[field.pathKey] = path;
  }
  const depositRaw = formData.get("deposit_percent");
  const announcementHref = String(formData.get("announcement_href") ?? current?.announcement_href ?? "/products").trim();
  const announcementScope = String(formData.get("announcement_scope") ?? current?.announcement_scope ?? "all");
  const announcementEnabledValues = formData.getAll("announcement_enabled");
  const announcementButtonEnabledValues = formData.getAll("announcement_button_enabled");
  if (announcementScope !== "all" && announcementScope !== "home") {
    await cleanupPendingImageUploads();
    return { ok: false as const, error: "اختر نطاق ظهور صحيح للإعلان." };
  }
  if (announcementHref.length > 300 || (announcementHref && !announcementHref.startsWith("/") && !/^https:\/\//i.test(announcementHref)) || announcementHref.startsWith("//")) {
    await cleanupPendingImageUploads();
    return { ok: false as const, error: "رابط الإعلان يجب أن يكون رابطًا داخليًا أو يبدأ بـ https://." };
  }
  const { error } = await supabase.from("store_settings").upsert({
    id: 1,
    store_name: String(formData.get("store_name") ?? current?.store_name ?? "Taiz 3D Printing"),
    logo_path: uploadedLogoPath ?? (removeLogo ? null : current?.logo_path ?? null),
    description: String(formData.get("description") ?? current?.description ?? ""),
    hero_headline: String(formData.get("hero_headline") ?? current?.hero_headline ?? ""),
    hero_description: String(formData.get("hero_description") ?? current?.hero_description ?? ""),
    all_products_image_path: uploadedCardPaths.all_products_image_path ?? (formData.get("remove_all_products_image") === "on" ? null : current?.all_products_image_path ?? null),
    custom_order_image_path: uploadedCardPaths.custom_order_image_path ?? (formData.get("remove_custom_order_image") === "on" ? null : current?.custom_order_image_path ?? null),
    announcement_enabled: formData.has("announcement_enabled") ? announcementEnabledValues.includes("on") : current?.announcement_enabled ?? true,
    announcement_text: String(formData.get("announcement_text") ?? current?.announcement_text ?? "عروض جديدة ومنتجات مميزة بانتظارك").trim(),
    announcement_button_label: String(formData.get("announcement_button_label") ?? current?.announcement_button_label ?? "تسوق الآن").trim(),
    announcement_href: announcementHref,
    announcement_scope: announcementScope,
    announcement_button_enabled: formData.has("announcement_button_enabled") ? announcementButtonEnabledValues.includes("on") : current?.announcement_button_enabled ?? true,
    deposit_percent:
      depositRaw == null || String(depositRaw) === ""
        ? Number(current?.deposit_percent ?? 30)
        : Number(depositRaw),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    await cleanupPendingImageUploads();
    console.error("Store settings save failed", { error });
    return { ok: false as const, error: "تعذر حفظ إعدادات المتجر. أعد المحاولة." };
  }
  for (const field of cardImageFields) {
    const uploadedPath = uploadedCardPaths[field.pathKey];
    const oldPath = current?.[field.pathKey] as string | null | undefined;
    if ((uploadedPath || formData.get(field.removeName) === "on") && oldPath && !oldPath.startsWith("/") && !/^https?:\/\//i.test(oldPath)) {
      const { error: cleanupError } = await supabase.storage.from("store-assets").remove([oldPath]);
      if (cleanupError) console.error("Failed to remove old storefront card image", { path: oldPath, error: cleanupError });
    }
  }
  const oldLogoPath = current?.logo_path;
  if ((uploadedLogoPath || removeLogo) && oldLogoPath && !oldLogoPath.startsWith("/") && !/^https?:\/\//i.test(oldLogoPath)) {
    const { error: cleanupError } = await supabase.storage.from("store-assets").remove([oldLogoPath]);
    if (cleanupError) console.error("Failed to remove the replaced store logo", { path: oldLogoPath, error: cleanupError });
  }
  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/store-information");
  return { ok: true as const };
}

export async function saveCustomOrderContent(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { data: current, error: loadError } = await supabase.from("custom_order_content").select("*").eq("id", 1).maybeSingle();
  if (loadError) {
    console.error("Custom order content could not be loaded before save", { error: loadError });
    return { ok: false as const, error: "تعذر تحميل محتوى الطلب المخصص. تأكد من تشغيل migration المحتوى ثم حاول مرة أخرى." };
  }
  const defaultSteps = [
    { title: "شارك فكرتك", description: "أرسل وصفًا مختصرًا لما تريد طباعته أو أرفق صورة أو تصميمًا في المحادثة." },
    { title: "نراجع التفاصيل", description: "نراجع الفكرة وإمكانية التنفيذ والخامة المناسبة، ثم نوضح لك أي تفاصيل لازمة." },
    { title: "نؤكد السعر والمدة", description: "يتم الاتفاق على السعر ومدة الإنتاج وطريقة التسليم قبل بدء التنفيذ." },
  ];
  const defaultMaterials = ["فكرة أو وصف للقطعة", "صورة أو رسم مرجعي", "ملف تصميم جاهز", "الخامة واللون المطلوبان"];
  const storedSteps = Array.isArray(current?.steps) ? current.steps : defaultSteps;
  const storedMaterials = Array.isArray(current?.materials) ? current.materials : defaultMaterials;
  const text = (name: string, fallback = "") => formData.has(name) ? String(formData.get(name) ?? "").trim() : fallback;
  const steps = [1, 2, 3].map((index) => ({
    title: text(`step_${index}_title`, String(storedSteps[index - 1]?.title ?? defaultSteps[index - 1].title).trim()),
    description: text(`step_${index}_description`, String(storedSteps[index - 1]?.description ?? defaultSteps[index - 1].description).trim()),
  }));
  const materials = [1, 2, 3, 4].map((index) => text(`material_${index}`, String(storedMaterials[index - 1] ?? defaultMaterials[index - 1]).trim()));
  if (steps.some((step) => !step.title || !step.description) || materials.some((item) => !item)) {
    return { ok: false as const, error: "أكمل عناوين وأوصاف الخطوات وجميع عناصر القائمة قبل الحفظ." };
  }
  if (text("title").length > 120 || text("description").length > 500 || text("note").length > 500) {
    return { ok: false as const, error: "اختصر النصوص الطويلة ثم حاول الحفظ مرة أخرى." };
  }
  const { error } = await supabase.from("custom_order_content").upsert({
    id: 1,
    eyebrow: text("eyebrow", current?.eyebrow ?? "تصنيع حسب فكرتك"),
    title: text("title", current?.title ?? "حوّل فكرتك إلى قطعة مطبوعة ثلاثيًا"),
    description: text("description", current?.description ?? ""),
    whatsapp_message: text("whatsapp_message", current?.whatsapp_message ?? "مرحبًا، أريد طلب طباعة ثلاثية الأبعاد مخصّصة."),
    response_time: text("response_time", current?.response_time ?? "نراجع التفاصيل ونرد عليك بأقرب وقت ممكن."),
    process_title: text("process_title", current?.process_title ?? "كيف يتم طلبك؟"),
    process_description: text("process_description", current?.process_description ?? ""),
    steps,
    materials_title: text("materials_title", current?.materials_title ?? "ما الذي يمكنك إرساله؟"),
    materials_description: text("materials_description", current?.materials_description ?? ""),
    materials,
    note: text("note", current?.note ?? ""),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("Custom order content save failed", { error });
    return { ok: false as const, error: "تعذر حفظ محتوى الطلب المخصص. طبّق migration المحتوى ثم حاول مرة أخرى." };
  }
  revalidatePath("/custom-order");
  revalidatePath("/admin/custom-order");
  return { ok: true as const };
}

export async function saveHomepageSlide(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const id = String(formData.get("id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const rawHref = String(formData.get("href") ?? "").trim();
  const isPublished = formData.get("is_published") === "on";
  if (title.length > 120) return { ok: false as const, error: "اجعل عنوان الشريحة أقصر من 120 حرفًا." };
  if (description.length > 240) return { ok: false as const, error: "اجعل وصف الشريحة أقصر من 240 حرفًا." };
  if (rawHref.length > 500 || (rawHref && !rawHref.startsWith("/") && !/^https:\/\//i.test(rawHref)) || rawHref.startsWith("//")) {
    return { ok: false as const, error: "الرابط الاختياري يجب أن يكون رابطًا داخليًا أو يبدأ بـ https://." };
  }
  const { data: slides, error: listError } = await supabase.from("homepage_slides").select("id, image_path, sort_order").order("sort_order");
  if (listError) {
    console.error("Homepage slide list could not be loaded", { error: listError });
    return { ok: false as const, error: "تعذر تحميل الشرائح. تأكد من تشغيل تحديث قاعدة البيانات ثم حاول مجددًا." };
  }
  if (slides.length > 8) return { ok: false as const, error: "تجاوز عدد الشرائح الحد المسموح. تواصل مع مسؤول النظام." };
  const current = id ? slides.find((slide) => slide.id === id) : null;
  if (id && !current) return { ok: false as const, error: "لم نعثر على الشريحة. حدّث الصفحة وحاول مجددًا." };
  if (!id && slides.length >= 8) return { ok: false as const, error: "وصلت إلى الحد الأقصى وهو 8 شرائح." };
  const imageValue = formData.get("slide_image");
  const imageFile = imageValue instanceof File && imageValue.size > 0 ? imageValue : null;
  let uploadedPath: string | null = null;
  if (imageFile) {
    const metadataError = validateProductImageMetadata(imageFile);
    if (metadataError) return { ok: false as const, error: metadataError };
    const bytes = new Uint8Array(await imageFile.arrayBuffer());
    if (!hasValidProductImageSignature(imageFile.type, bytes)) {
      return { ok: false as const, error: "محتوى الملف لا يطابق صورة صالحة. اختر JPG أو PNG أو WebP." };
    }
    uploadedPath = `homepage/${crypto.randomUUID()}.${productImageExtension(imageFile.type)}`;
    const { error: uploadError } = await supabase.storage.from("store-assets").upload(uploadedPath, Buffer.from(bytes), { contentType: imageFile.type, upsert: false });
    if (uploadError) {
      console.error("Homepage slide image upload failed", { error: uploadError });
      return { ok: false as const, error: "تعذر رفع صورة الشريحة. تحقق من الاتصال وحاول مرة أخرى." };
    }
  }
  const imagePath = uploadedPath ?? current?.image_path ?? null;
  if (isPublished && !imagePath) {
    return { ok: false as const, error: "أضف صورة للشريحة قبل نشرها." };
  }
  const payload = {
    title,
    description,
    image_alt: "",
    href: rawHref || null,
    image_path: imagePath,
    is_published: isPublished,
    updated_at: new Date().toISOString(),
  };
  const { data: saved, error: saveError } = id
    ? await supabase.from("homepage_slides").update(payload).eq("id", id).select("id").maybeSingle()
    : await supabase.from("homepage_slides").insert({ ...payload, sort_order: slides.length }).select("id").maybeSingle();
  if (saveError || !saved) {
    if (uploadedPath) {
      const { error: cleanupError } = await supabase.storage.from("store-assets").remove([uploadedPath]);
      if (cleanupError) console.error("Could not clean up unlinked homepage slide image", { path: uploadedPath, error: cleanupError });
    }
    console.error("Homepage slide save failed", { error: saveError });
    return { ok: false as const, error: "تعذر حفظ الشريحة. تحقق من البيانات وحاول مرة أخرى." };
  }
  if (uploadedPath && current?.image_path) {
    const { error: cleanupError } = await supabase.storage.from("store-assets").remove([current.image_path]);
    if (cleanupError) console.error("Could not remove replaced homepage slide image", { path: current.image_path, error: cleanupError });
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage-slides");
  return { ok: true as const, id: saved.id };
}

export async function reorderHomepageSlides(formData: FormData) {
  await requireAdmin();
  let ids: unknown;
  try { ids = JSON.parse(String(formData.get("slide_ids") ?? "")); } catch { return { ok: false as const, error: "تعذر قراءة ترتيب الشرائح." }; }
  if (!Array.isArray(ids) || ids.length > 8 || ids.some((value) => typeof value !== "string")) {
    return { ok: false as const, error: "ترتيب الشرائح غير صالح." };
  }
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("admin_reorder_homepage_slides", { p_slide_ids: ids });
  if (error) {
    console.error("Homepage slide reorder failed", { error });
    return { ok: false as const, error: "تعذر تحديث الترتيب. حدّث الصفحة ثم حاول مرة أخرى." };
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage-slides");
  return { ok: true as const };
}

export async function deleteHomepageSlide(id: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { data: slide, error: loadError } = await supabase.from("homepage_slides").select("id, image_path").eq("id", id).maybeSingle();
  if (loadError || !slide) return { ok: false as const, error: "لم نعثر على الشريحة. حدّث الصفحة وحاول مجددًا." };
  const { error } = await supabase.from("homepage_slides").delete().eq("id", id);
  if (error) {
    console.error("Homepage slide delete failed", { error });
    return { ok: false as const, error: "تعذر حذف الشريحة. حاول مرة أخرى." };
  }
  const { data: remaining } = await supabase.from("homepage_slides").select("id").order("sort_order");
  const { error: reorderError } = await supabase.rpc("admin_reorder_homepage_slides", { p_slide_ids: (remaining ?? []).map((row) => row.id) });
  if (reorderError) console.error("Homepage slides could not be compacted after deletion", { error: reorderError });
  if (slide.image_path) {
    const { error: storageError } = await supabase.storage.from("store-assets").remove([slide.image_path]);
    if (storageError) console.error("Homepage slide deleted but its image cleanup failed", { path: slide.image_path, error: storageError });
  }
  revalidatePath("/");
  revalidatePath("/admin/homepage-slides");
  return { ok: true as const };
}

export async function saveContactSettings(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("contact_settings").upsert({
    id: 1,
    phone: String(formData.get("phone") ?? "") || null,
    whatsapp: String(formData.get("whatsapp") ?? "") || null,
    instagram: String(formData.get("instagram") ?? "") || null,
    email: String(formData.get("email") ?? "") || null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: "تعذر حفظ معلومات التواصل" };
  revalidatePath("/");
  revalidatePath("/admin/contact-information");
  return { ok: true as const };
}

export async function saveLegalPage(formData: FormData) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.from("legal_pages").upsert({
    slug: String(formData.get("slug")),
    title: String(formData.get("title")),
    body: String(formData.get("body")),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false as const, error: "تعذر حفظ الصفحة القانونية" };
  revalidatePath("/admin/legal-pages");
  return { ok: true as const };
}
