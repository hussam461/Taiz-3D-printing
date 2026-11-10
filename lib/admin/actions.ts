"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { canTransition } from "@/lib/orders/transitions";
import { PAYMENT_CURRENCIES } from "@/types/domain";
import { hasValidProductImageSignature, parseProductForm, productImageExtension, validateProductImageMetadata } from "@/lib/validation/product";
import { parseDeliveryFee } from "@/lib/validation/delivery-fee";

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
  if (toStatus === "shipped" || toStatus === "completed") {
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

export async function completeOrderDelivery(orderId: string) {
  await requireAdmin();
  const supabase = await createServerSupabase();
  const { error } = await supabase.rpc("admin_complete_order_delivery", { p_order_id: orderId });
  if (error) {
    console.error("Order delivery and balance collection could not be recorded", { orderId, error });
    if (error.code === "PGRST202" || error.code === "PGRST204") {
      return { ok: false as const, error: "تأكيد التسليم والتحصيل غير مفعّل في قاعدة البيانات بعد. شغّل تحديث قاعدة البيانات المطلوب ثم حاول مجددًا." };
    }
    if (error.message.includes("order is not ready for delivery")) return { ok: false as const, error: "لا يمكن تسجيل التسليم قبل أن يصبح الطلب جاهزًا للتسليم." };
    if (error.message.includes("order is not out for delivery")) return { ok: false as const, error: "حدّث قاعدة البيانات أولًا لتفعيل تسجيل التسليم من حالة جاهز للتسليم." };
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

export async function reviewProof(proofId: string, decision: "approved" | "rejected", reason?: string) {
  await requireAdmin();
  if (decision === "rejected" && !reason?.trim()) {
    return { ok: false as const, error: "سبب الرفض مطلوب" };
  }
  const supabase = await createServerSupabase();
  const { data: proof, error: proofLoadError } = await supabase.from("payment_proofs").select("order_id").eq("id", proofId).maybeSingle();
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
    if (error.message.includes("rejection reason required")) return { ok: false as const, error: "اكتب سبب رفض الإثبات ليعرف العميل ما الذي يحتاج إلى تصحيحه." };
    if (error.message.includes("not authorized")) return { ok: false as const, error: "انتهت صلاحية الجلسة أو لا تملك صلاحية مراجعة الإثبات. سجّل الدخول مجددًا." };
    if (error.code === "PGRST202" || error.code === "PGRST204") return { ok: false as const, error: "تحديث قاعدة البيانات المطلوب غير مفعّل بعد. شغّل migration تشغيل الطلبات وإثباتات الدفع ثم أعد المحاولة." };
    return { ok: false as const, error: "تعذر مراجعة الإثبات وتحديث الطلب. لم يُسجّل القرار؛ أعد المحاولة." };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payment-proofs");
  revalidatePath(`/admin/orders/${proof.order_id}`);
  return { ok: true as const };
}

type ProductActionState =
  | { ok: true; productId: string; created: boolean }
  | { ok: false; error: string; fieldErrors?: import("@/lib/validation/product").ProductFieldErrors };

export async function upsertProduct(_previousState: ProductActionState | null, formData: FormData): Promise<ProductActionState> {
  const admin = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = parseProductForm(formData);
  if (!parsed.success) return { ok: false, error: "راجع الحقول المحددة ثم حاول الحفظ مرة أخرى.", fieldErrors: parsed.fieldErrors };
  const data = parsed.data;
  const suppliedFiles = [...formData.getAll("product_image"), ...formData.getAll("product_images")];
  const imageFiles = suppliedFiles.filter((value): value is File => value instanceof File && value.size > 0);
  if (imageFiles.length > 1) return { ok: false, error: "ارفع صورة واحدة فقط لهذا المنتج.", fieldErrors: { image: "يسمح بصورة واحدة فقط." } };
  if (suppliedFiles.some((value) => value instanceof File && value.size > 0) && imageFiles.length !== 1) {
    return { ok: false, error: "تعذر قراءة الصورة. اختر صورة أخرى.", fieldErrors: { image: "تعذر قراءة ملف الصورة." } };
  }
  const image = imageFiles[0];
  if (image) {
    const metadataError = validateProductImageMetadata(image);
    if (metadataError) return { ok: false, error: metadataError, fieldErrors: { image: metadataError } };
    if (!hasValidProductImageSignature(image.type, new Uint8Array(await image.arrayBuffer()))) {
      return { ok: false, error: "محتوى الملف لا يطابق صيغة الصورة. اختر ملف صورة صالحًا.", fieldErrors: { image: "الملف ليس صورة صالحة." } };
    }
  }

  const supabase = await createServerSupabase();
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
  if (data.isActive && !image && !existingImage) return { ok: false, error: "أضف صورة للمنتج قبل نشره.", fieldErrors: { image: "الصورة مطلوبة للمنتج المنشور." } };
  if (id && data.isActive && !image && existingImage && !existingImage.is_main) {
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

  if (image) {
    const path = `${productId}/${crypto.randomUUID()}.${productImageExtension(image.type)}`;
    const bytes = Buffer.from(await image.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("product-images").upload(path, bytes, { contentType: image.type, upsert: false });
    if (uploadError) {
      console.error("Product image upload failed", { productId, error: uploadError });
      if (created) await supabase.from("products").delete().eq("id", productId);
      return { ok: false, error: "تعذر رفع الصورة. تحقق من الاتصال وحاول مرة أخرى.", fieldErrors: { image: "فشل رفع الصورة." } };
    }
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
      const { error: cleanupError } = await supabase.storage.from("product-images").remove([path]);
      if (cleanupError) console.error("Orphan product image cleanup failed", { productId, path, error: cleanupError });
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
  const column = table === "legal_pages" ? "slug" : "id";
  const { error } = await supabase.from(table).delete().eq(column, id);
  if (error) {
    if (table === "categories") return { ok: false as const, error: "لا يمكن حذف التصنيف لأنه مرتبط بمنتج. عطّله بدلًا من حذفه." };
    if (table === "payment_accounts") return { ok: false as const, error: error.message.includes("حساب دفع") ? error.message : "تعذر حذف حساب الدفع. تأكد من وجود حساب نشط آخر." };
    return { ok: false as const, error: "تعذر حذف العنصر. تحقق من البيانات وحاول مرة أخرى." };
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
  const depositRaw = formData.get("deposit_percent");
  const { error } = await supabase.from("store_settings").upsert({
    id: 1,
    store_name: String(formData.get("store_name") ?? current?.store_name ?? "Taiz 3D Printing"),
    logo_path: uploadedLogoPath ?? current?.logo_path ?? null,
    description: String(formData.get("description") ?? current?.description ?? ""),
    hero_headline: String(formData.get("hero_headline") ?? current?.hero_headline ?? ""),
    hero_description: String(formData.get("hero_description") ?? current?.hero_description ?? ""),
    deposit_percent:
      depositRaw == null || String(depositRaw) === ""
        ? Number(current?.deposit_percent ?? 30)
        : Number(depositRaw),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (uploadedLogoPath) {
      const { error: cleanupError } = await supabase.storage.from("store-assets").remove([uploadedLogoPath]);
      if (cleanupError) console.error("Failed to clean up an unlinked store logo", { path: uploadedLogoPath, error: cleanupError });
    }
    console.error("Store settings save failed", { error });
    return { ok: false as const, error: "تعذر حفظ إعدادات المتجر. أعد المحاولة." };
  }
  const oldLogoPath = current?.logo_path;
  if (uploadedLogoPath && oldLogoPath && oldLogoPath !== uploadedLogoPath && !oldLogoPath.startsWith("/") && !/^https?:\/\//i.test(oldLogoPath)) {
    const { error: cleanupError } = await supabase.storage.from("store-assets").remove([oldLogoPath]);
    if (cleanupError) console.error("Failed to remove the replaced store logo", { path: oldLogoPath, error: cleanupError });
  }
  revalidatePath("/");
  revalidatePath("/", "layout");
  revalidatePath("/admin/settings");
  revalidatePath("/admin/store-information");
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
