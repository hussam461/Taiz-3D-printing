import { z } from "zod";

export const PRODUCT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

const PRODUCT_DESCRIPTION_TAGS = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li", "span"]);

function escapeDescriptionText(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Retain only the small, safe formatting subset used by the product description editor. */
export function sanitizeProductDescriptionMarkup(value: string): string {
  let input = value.slice(0, 20_000).replace(/<!--[\s\S]*?-->/g, "");
  input = input.replace(/<(script|style|iframe|object|embed|svg|math|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
  input = input.replace(/<font\b[^>]*size=["']?([45])["']?[^>]*>/gi, (_tag, size: string) => `<span style="font-size:${size === "4" ? "1.25em" : "1.5em"}">`).replace(/<\/font\s*>/gi, "</span>");

  const hasMarkup = /<\/?(?:p|div|br|strong|b|em|i|u|ul|ol|li|span)\b/i.test(input);
  if (!hasMarkup) return escapeDescriptionText(input).replace(/\r\n?|\n/g, "<br>");

  let result = "";
  let cursor = 0;
  const tagPattern = /<\s*(\/?)\s*([a-z][a-z0-9]*)\b([^>]*)>/gi;
  for (const match of input.matchAll(tagPattern)) {
    const index = match.index ?? 0;
    result += escapeDescriptionText(input.slice(cursor, index));
    cursor = index + match[0].length;
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (!PRODUCT_DESCRIPTION_TAGS.has(tag)) continue;
    if (tag === "span" && !closing) {
      const style = match[3].match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
      const rawSize = style.match(/font-size\s*:\s*([\w.%-]+)/i)?.[1]?.toLowerCase();
      const numericSize = rawSize?.match(/^(\d+(?:\.\d+)?)(px|pt|em|rem)$/);
      let fontSize = rawSize === "large" || rawSize === "x-large" ? "1.25em" : undefined;
      if (numericSize) {
        const amount = Number(numericSize[1]);
        const pixels = numericSize[2] === "pt" ? amount * (4 / 3) : amount;
        if (numericSize[2] === "em" || numericSize[2] === "rem") fontSize = amount >= 1.4 ? "1.5em" : amount >= 1.15 ? "1.25em" : undefined;
        else fontSize = pixels >= 28 ? "1.5em" : pixels >= 18 ? "1.25em" : undefined;
      }
      const fontWeight = /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(style) ? "bold" : undefined;
      const safeStyles = [fontSize ? `font-size:${fontSize}` : "", fontWeight ? `font-weight:${fontWeight}` : ""].filter(Boolean).join(";");
      result += safeStyles ? `<span style="${safeStyles}">` : "<span>";
    } else {
      const normalizedTag = tag === "div" ? "p" : tag;
      result += closing ? `</${normalizedTag}>` : `<${normalizedTag}>`;
    }
  }
  result += escapeDescriptionText(input.slice(cursor));
  return result;
}

export function productDescriptionToText(value: string): string {
  return sanitizeProductDescriptionMarkup(value)
    .replace(/<br\s*>/gi, "\n")
    .replace(/<\/(?:p|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

const productFieldsSchema = z.object({
  name: z.string().trim().min(2, "اسم المنتج يجب أن يتكون من حرفين على الأقل."),
  description: z.string().min(1, "وصف المنتج مطلوب.").max(20_000, "وصف المنتج طويل جدًا.")
    .transform(sanitizeProductDescriptionMarkup)
    .refine((value) => productDescriptionToText(value).trim().length > 0, "وصف المنتج مطلوب."),
  category_id: z.string().uuid("اختر تصنيفًا صالحًا."),
  base_price_old_yer: z
    .string()
    .trim()
    .min(1, "أدخل سعر المنتج.")
    .regex(/^\d+$/, "أدخل السعر كرقم صحيح بالريال القديم.")
    .transform(Number)
    .pipe(z.number().int().nonnegative("السعر لا يمكن أن يكون سالبًا.")),
  discount_percent: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.coerce.number().finite("أدخل نسبة خصم صالحة.").min(0, "الخصم لا يمكن أن يكون سالبًا.").max(100, "نسبة الخصم لا يمكن أن تتجاوز 100٪.").optional(),
  ),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  seo_title: z.string(),
  seo_description: z.string(),
});

export type ProductFieldErrors = Partial<Record<
  | "name"
  | "description"
  | "category_id"
  | "base_price_old_yer"
  | "discount_percent"
  | "image"
  | "specifications",
  string
>>;

export type ParsedProductForm = {
  name: string;
  description: string;
  categoryId: string;
  basePriceOldYer: number;
  discountPercent: number | null;
  isActive: boolean;
  isFeatured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
  specifications: { label: string; value: string }[];
};

export function parseProductForm(formData: FormData):
  | { success: true; data: ParsedProductForm }
  | { success: false; fieldErrors: ProductFieldErrors } {
  const result = productFieldsSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    category_id: formData.get("category_id"),
    base_price_old_yer: formData.get("base_price_old_yer"),
    discount_percent: formData.get("discount_percent") ?? "",
    is_active: formData.get("is_active") === "on",
    is_featured: formData.get("is_featured") === "on",
    seo_title: String(formData.get("seo_title") ?? "").trim(),
    seo_description: String(formData.get("seo_description") ?? "").trim(),
  });

  const fieldErrors: ProductFieldErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && field in productFieldNames && !fieldErrors[field as keyof ProductFieldErrors]) {
        fieldErrors[field as keyof ProductFieldErrors] = issue.message;
      }
    }
  }

  const labels = formData.getAll("specification_label").map((value) => String(value).trim());
  const values = formData.getAll("specification_value").map((value) => String(value).trim());
  const specifications: { label: string; value: string }[] = [];
  if (labels.length !== values.length) {
    fieldErrors.specifications = "أكمل اسم وقيمة كل مواصفة، أو اترك الحقلين فارغين.";
  } else {
    labels.forEach((label, index) => {
      const value = values[index];
      if (!label && !value) return;
      if (!label || !value) {
        fieldErrors.specifications ??= "أكمل اسم وقيمة كل مواصفة، أو اترك الحقلين فارغين.";
        return;
      }
      specifications.push({ label, value });
    });
  }

  if (!result.success || Object.keys(fieldErrors).length > 0) {
    return { success: false, fieldErrors };
  }

  return {
    success: true,
    data: {
      name: result.data.name,
      description: sanitizeProductDescriptionMarkup(result.data.description),
      categoryId: result.data.category_id,
      basePriceOldYer: result.data.base_price_old_yer,
      discountPercent: result.data.discount_percent && result.data.discount_percent > 0 ? result.data.discount_percent : null,
      isActive: result.data.is_active,
      isFeatured: result.data.is_featured,
      seoTitle: result.data.seo_title || null,
      seoDescription: result.data.seo_description || null,
      specifications,
    },
  };
}

const productFieldNames = {
  name: true,
  description: true,
  category_id: true,
  base_price_old_yer: true,
  discount_percent: true,
  is_active: true,
  is_featured: true,
  seo_title: true,
  seo_description: true,
} as const;

export function validateProductImageMetadata(file: { type: string; size: number }): string | null {
  if (file.size <= 0) return "اختر صورة للمنتج.";
  if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_MIME_TYPES)[number])) {
    return "صيغة الصورة غير مدعومة. اختر JPG أو PNG أو WebP.";
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) return "حجم الصورة يتجاوز 5MB. اختر صورة أصغر.";
  return null;
}

export function hasValidProductImageSignature(mimeType: string, bytes: Uint8Array): boolean {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((byte, index) => bytes[index] === byte);
  }
  if (mimeType === "image/webp") {
    return (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    );
  }
  return false;
}

export function productImageExtension(mimeType: string): string {
  return mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
}
