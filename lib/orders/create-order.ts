import { checkoutPayloadSchema, type CheckoutPayload } from "@/lib/validation/checkout";
import { createServiceClient } from "@/lib/supabase/service";
import {
  amountInPaymentCurrency,
  calculateOrderTotals,
} from "@/lib/pricing";
import { ALLOWED_PROOF_TYPES, MAX_PROOF_BYTES } from "@/types/domain";

export type CreateOrderResult =
  | {
      ok: true;
      reference: string;
      finalTotalOldYer: number;
      depositOldYer: number;
      remainingOldYer: number;
      paymentStatus: "proof_pending";
      payableDeposit: number;
      payableRemaining: number;
      paymentCurrency: CheckoutPayload["paymentCurrency"];
    }
  | { ok: false; error: string; proofMustBeReuploaded?: boolean };

function isAllowedProof(type: string, size: number) {
  return (
    (ALLOWED_PROOF_TYPES as readonly string[]).includes(type) &&
    size > 0 &&
    size <= MAX_PROOF_BYTES
  );
}

const stagingPathPattern = /^checkout-staging\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|png|webp|pdf)$/i;

export async function createOrderFromCheckout(
  raw: unknown,
  stagedProofPath: string,
  originalFileName: string,
): Promise<CreateOrderResult> {
  const parsed = checkoutPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير مكتملة" };
  }
  const input = parsed.data;
  const email =
    input.customerEmail && input.customerEmail.length > 0 ? input.customerEmail : null;

  const supabase = createServiceClient();

  const { data: existing } = await supabase
    .from("orders")
    .select("reference, final_total_old_yer, deposit_old_yer, remaining_old_yer, payment_status, payable_deposit, payable_remaining, payment_currency")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();
  if (existing) {
    return {
      ok: true,
      reference: existing.reference,
      finalTotalOldYer: Number(existing.final_total_old_yer),
      depositOldYer: Number(existing.deposit_old_yer),
      remainingOldYer: Number(existing.remaining_old_yer),
      paymentStatus: "proof_pending",
      payableDeposit: Number(existing.payable_deposit),
      payableRemaining: Number(existing.payable_remaining),
      paymentCurrency: existing.payment_currency,
    };
  }

  if (!stagingPathPattern.test(stagedProofPath)) {
    return { ok: false, error: "ارفع إثبات التحويل قبل إرسال الطلب.", proofMustBeReuploaded: true };
  }

  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id, name, slug, base_price_old_yer, discount_percent, is_active, product_images(storage_path, is_main)")
    .in("id", productIds);
  if (productError || !products || products.length !== productIds.length) {
    return { ok: false, error: "أحد المنتجات لم يعد متاحًا" };
  }
  if (products.some((product) => !product.is_active)) {
    return { ok: false, error: "أحد المنتجات لم يعد متاحًا" };
  }

  const [{ data: colors }, { data: materials }, { data: area }, { data: account }, { data: store }, { data: rates }, { data: freeRow }] =
    await Promise.all([
      supabase.from("colors").select("*").eq("is_active", true),
      supabase.from("materials").select("*").eq("is_active", true),
      supabase.from("delivery_areas").select("*").eq("id", input.deliveryAreaId).eq("is_active", true).maybeSingle(),
      supabase
        .from("payment_accounts")
        .select("*")
        .eq("id", input.paymentAccountId)
        .eq("is_active", true)
        .maybeSingle(),
      supabase.from("store_settings").select("deposit_percent").eq("id", 1).maybeSingle(),
      supabase.from("exchange_rates").select("*").order("created_at", { ascending: false }).limit(1),
      supabase.from("free_delivery_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  if (!area) return { ok: false, error: "منطقة التوصيل غير متاحة" };
  if (!account) return { ok: false, error: "حساب الدفع لم يعد متاحًا" };
  if (account.currency_code !== input.paymentCurrency) {
    return { ok: false, error: "حساب الدفع لا يطابق عملة التحويل" };
  }

  const colorById = new Map((colors ?? []).map((row) => [row.id, row]));
  const materialById = new Map((materials ?? []).map((row) => [row.id, row]));
  for (const item of input.items) {
    if ((colors?.length ?? 0) > 0 && (!item.colorId || !colorById.has(item.colorId))) return { ok: false, error: "اختر لونًا متاحًا للمنتج" };
    if ((materials?.length ?? 0) > 0 && (!item.materialId || !materialById.has(item.materialId))) return { ok: false, error: "اختر خامة متاحة للمنتج" };
  }

  const productById = new Map(products.map((row) => [row.id, row]));
  const totals = calculateOrderTotals({
    lines: input.items.map((item) => {
      const product = productById.get(item.productId)!;
      return {
        productId: item.productId,
        quantity: item.quantity,
        basePriceOldYer: Number(product.base_price_old_yer),
        discountPercent: product.discount_percent == null ? null : Number(product.discount_percent),
      };
    }),
    delivery: {
      feeOldYer: Number(area.fee_old_yer),
      freeDeliveryEnabled: Boolean(freeRow?.is_enabled),
      freeDeliveryMinOldYer: Number(freeRow?.min_order_value_old_yer ?? 0),
    },
    depositPercent: Number(store?.deposit_percent ?? 30),
  });

  const rate = Number(rates?.[0]?.new_rial_per_old_rial ?? 0);
  if (input.paymentCurrency === "NEW_YER" && rate <= 0) {
    return { ok: false, error: "سعر التحويل غير مهيأ" };
  }

  const payableTotal = amountInPaymentCurrency(totals.finalTotalOldYer, input.paymentCurrency, rate);
  const payableDeposit = amountInPaymentCurrency(totals.depositOldYer, input.paymentCurrency, rate);
  const payableRemaining = amountInPaymentCurrency(totals.remainingOldYer, input.paymentCurrency, rate);

  let reference = "";
  const orderId = crypto.randomUUID();
  const proofId = crypto.randomUUID();
  const { data: proofFile, error: stagedProofError } = await supabase.storage.from("payment-proofs").download(stagedProofPath);
  if (stagedProofError || !proofFile || !isAllowedProof(proofFile.type, proofFile.size)) {
    return { ok: false, error: "تعذر التحقق من صورة الإثبات. أعد رفعها ثم حاول مرة أخرى.", proofMustBeReuploaded: true };
  }
  const proofType = proofFile.type;
  const proofSize = proofFile.size;
  const ext = proofType === "application/pdf" ? "pdf" : proofType.split("/")[1] ?? "bin";
  const safeOriginalFileName = originalFileName
    .replace(/[\\/\r\n\0]/g, "_")
    .trim()
    .slice(0, 180) || `payment-proof.${ext}`;
  const storagePath = `${orderId}/${proofId}.${ext}`;

  const orderPayload = {
    id: orderId,
    idempotency_key: input.idempotencyKey,
    customer_name: input.customerName,
    customer_phone: input.customerPhone,
    customer_email: email,
    delivery_governorate: area.governorate,
    delivery_city_area: area.city_area,
    delivery_address: input.address,
    delivery_notes: input.deliveryNotes || null,
    delivery_area_id: area.id,
    snapshot_delivery: {
      id: area.id,
      governorate: area.governorate,
      city_area: area.city_area,
      fee_old_yer: Number(area.fee_old_yer),
    },
    snapshot_currency: {
      payment_currency: input.paymentCurrency,
      new_rial_per_old_rial: rate,
      rounding_mode: "nearest_integer",
    },
    snapshot_payment_account: {
      id: account.id,
      name: account.name,
      account_number: account.account_number,
      currency_code: account.currency_code,
      instructions: account.instructions,
    },
    snapshot_free_delivery: {
      is_enabled: Boolean(freeRow?.is_enabled),
      min_order_value_old_yer: Number(freeRow?.min_order_value_old_yer ?? 0),
      applied: totals.freeDeliveryApplied,
    },
    subtotal_old_yer: totals.subtotalOldYer,
    discount_total_old_yer: totals.discountTotalOldYer,
    delivery_fee_old_yer: totals.deliveryFeeOldYer,
    free_delivery_applied: totals.freeDeliveryApplied,
    final_total_old_yer: totals.finalTotalOldYer,
    deposit_percent: totals.depositPercent,
    deposit_old_yer: totals.depositOldYer,
    remaining_old_yer: totals.remainingOldYer,
    payment_currency: input.paymentCurrency,
    payable_total: payableTotal,
    payable_deposit: payableDeposit,
    payable_remaining: payableRemaining,
    balance_status: totals.remainingOldYer > 0 ? "due" : "not_due",
    order_status: "pending",
    payment_status: "proof_pending",
  };

  let orderError: { code: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data: createdOrder, error } = await supabase.from("orders").insert(orderPayload).select("reference").single();
    if (!error) {
      reference = createdOrder.reference;
      orderError = null;
      break;
    }
    orderError = error;
    if (error.code !== "23505") break;
    const { data: again } = await supabase
      .from("orders")
      .select("reference, final_total_old_yer, deposit_old_yer, remaining_old_yer, payable_deposit, payable_remaining, payment_currency")
      .eq("idempotency_key", input.idempotencyKey)
      .maybeSingle();
    if (again) {
      return {
        ok: true,
        reference: again.reference,
        finalTotalOldYer: Number(again.final_total_old_yer),
        depositOldYer: Number(again.deposit_old_yer),
        remainingOldYer: Number(again.remaining_old_yer),
        paymentStatus: "proof_pending",
        payableDeposit: Number(again.payable_deposit),
        payableRemaining: Number(again.payable_remaining),
        paymentCurrency: again.payment_currency,
      };
    }
  }
  if (orderError) return { ok: false, error: "تعذر إنشاء الطلب. حاول مرة أخرى" };

  const itemsPayload = input.items.map((item, index) => {
    const product = productById.get(item.productId)!;
    const line = totals.lines[index];
    const images = product.product_images as { storage_path: string; is_main: boolean }[] | null;
    const main = images?.find((img) => img.is_main) ?? images?.[0];
    const selectedColor = (colors?.length ?? 0) > 0 && item.colorId ? colorById.get(item.colorId) : null;
    const selectedMaterial = (materials?.length ?? 0) > 0 && item.materialId ? materialById.get(item.materialId) : null;
    return {
      order_id: orderId,
      product_id: product.id,
      quantity: item.quantity,
      unit_base_price_old_yer: line.basePriceOldYer,
      discount_percent: line.discountPercent,
      unit_final_price_old_yer: line.unitFinalPriceOldYer,
      line_total_old_yer: line.lineTotalOldYer,
      color_name: selectedColor?.name ?? "",
      material_name: selectedMaterial?.name ?? "",
      snapshot: {
        product_id: product.id,
        name: product.name,
        slug: product.slug,
        image: main?.storage_path ?? null,
        color_id: selectedColor?.id ?? null,
        material_id: selectedMaterial?.id ?? null,
      },
    };
  });

  const { error: itemsError } = await supabase.from("order_items").insert(itemsPayload);
  if (itemsError) {
    await supabase.from("orders").delete().eq("id", orderId);
    return { ok: false, error: "تعذر حفظ بنود الطلب" };
  }

  const { error: moveError } = await supabase.storage
    .from("payment-proofs")
    .move(stagedProofPath, storagePath);
  if (moveError) {
    await supabase.from("orders").delete().eq("id", orderId);
    console.error("Checkout proof move failed", { orderId, error: moveError });
    return { ok: false, error: "تعذر إرفاق الإثبات بالطلب. تحقق من الاتصال ثم أعد المحاولة." };
  }

  const { error: proofError } = await supabase.from("payment_proofs").insert({
    id: proofId,
    order_id: orderId,
    storage_path: storagePath,
    original_filename: safeOriginalFileName,
    mime_type: proofType,
    byte_size: proofSize,
    status: "pending",
  });
  if (proofError) {
    const { error: restoreError } = await supabase.storage.from("payment-proofs").move(storagePath, stagedProofPath);
    if (restoreError) {
      const { error: removeError } = await supabase.storage.from("payment-proofs").remove([storagePath]);
      if (removeError) console.error("Could not clean up unlinked checkout proof", { orderId, error: removeError });
    }
    await supabase.from("orders").delete().eq("id", orderId);
    return {
      ok: false,
      error: restoreError ? "تعذر ربط الإثبات بالطلب. أعد رفع الإثبات ثم حاول مرة أخرى." : "تعذر حفظ إثبات الدفع مع الطلب. حاول مرة أخرى.",
      ...(restoreError ? { proofMustBeReuploaded: true } : {}),
    };
  }

  await supabase.from("order_status_history").insert({
    order_id: orderId,
    from_status: null,
    to_status: "pending",
    note: "تم إنشاء الطلب",
  });

  return {
    ok: true,
    reference,
    finalTotalOldYer: totals.finalTotalOldYer,
    depositOldYer: totals.depositOldYer,
    remainingOldYer: totals.remainingOldYer,
    paymentStatus: "proof_pending",
    payableDeposit,
    payableRemaining,
    paymentCurrency: input.paymentCurrency,
  };
}
