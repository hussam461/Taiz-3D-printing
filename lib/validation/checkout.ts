import { z } from "zod";
import { toWesternDigits } from "@/lib/formatting/money";
import { MAX_CART_QUANTITY, PAYMENT_CURRENCIES } from "@/types/domain";

export function normalizePhone(raw: string): string {
  const western = toWesternDigits(raw).replace(/[^\d+]/g, "");
  const digits = western.replace(/^\+/, "");
  if (digits.startsWith("967") && digits.length === 12) return digits;
  if (/^7\d{8}$/.test(digits)) return `967${digits}`;
  return digits;
}

export const yemenPhoneSchema = z
  .string()
  .trim()
  .min(1, "رقم الهاتف مطلوب")
  .transform(normalizePhone)
  .refine((value) => /^9677\d{8}$/.test(value), "أدخل رقم يمني يبدأ بـ 7");

export const checkoutItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(MAX_CART_QUANTITY),
  colorId: z.string().uuid().nullable(),
  materialId: z.string().uuid().nullable(),
});

export const checkoutPayloadSchema = z.object({
  idempotencyKey: z.string().uuid(),
  items: z.array(checkoutItemSchema).min(1, "السلة فارغة"),
  customerName: z.string().trim().min(2, "الاسم مطلوب").max(120),
  customerPhone: yemenPhoneSchema,
  customerEmail: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .pipe(z.string().email("البريد غير صالح").optional()),
  deliveryAreaId: z.string().uuid("اختر منطقة التوصيل"),
  address: z.string().trim().min(8, "العنوان التفصيلي مطلوب").max(400),
  deliveryNotes: z.string().trim().max(400).optional().or(z.literal("")),
  paymentCurrency: z.enum(PAYMENT_CURRENCIES),
  paymentAccountId: z.string().uuid("اختر حساب التحويل"),
});

export type CheckoutPayload = z.infer<typeof checkoutPayloadSchema>;
