import { describe, expect, it } from "vitest";
import {
  hasValidProductImageSignature,
  parseProductForm,
  validateProductImageMetadata,
} from "../lib/validation/product";

function validForm(overrides: Record<string, string> = {}) {
  const form = new FormData();
  form.set("name", "حامل أقلام");
  form.set("description", "وصف واضح للمنتج");
  form.set("category_id", "576277f0-4e57-4b4e-b0d5-01d06733c107");
  form.set("base_price_old_yer", "12000");
  form.set("discount_percent", "");
  form.set("is_active", "on");
  form.set("is_featured", "on");
  for (const [key, value] of Object.entries(overrides)) form.set(key, value);
  return form;
}

describe("product validation", () => {
  it("accepts valid required fields and an omitted optional discount", () => {
    const result = parseProductForm(validForm());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.basePriceOldYer).toBe(12000);
      expect(result.data.discountPercent).toBeNull();
      expect(result.data.isActive).toBe(true);
    }
  });

  it("accepts zero because the database allows a non-negative price", () => {
    const result = parseProductForm(validForm({ base_price_old_yer: "0" }));
    expect(result.success).toBe(true);
  });

  it.each([
    ["name", "", "name"],
    ["name", "A", "name"],
    ["description", "   ", "description"],
    ["category_id", "", "category_id"],
    ["base_price_old_yer", "", "base_price_old_yer"],
    ["base_price_old_yer", "-1", "base_price_old_yer"],
    ["base_price_old_yer", "1.5", "base_price_old_yer"],
    ["discount_percent", "101", "discount_percent"],
  ])("returns a field-specific error for invalid %s", (field, value, expectedField) => {
    const result = parseProductForm(validForm({ [field]: value }));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors[expectedField as keyof typeof result.fieldErrors]).toBeTruthy();
  });

  it("requires each optional specification row to have both a label and value", () => {
    const form = validForm();
    form.append("specification_label", "الخامة");
    form.append("specification_value", "");
    const result = parseProductForm(form);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.fieldErrors.specifications).toContain("أكمل اسم وقيمة");
  });

  it("accepts one complete optional specification", () => {
    const form = validForm();
    form.append("specification_label", "الخامة");
    form.append("specification_value", "PLA");
    const result = parseProductForm(form);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.specifications).toEqual([{ label: "الخامة", value: "PLA" }]);
  });
});

describe("product image validation", () => {
  it("allows supported images within the storage bucket limit", () => {
    expect(validateProductImageMetadata({ type: "image/jpeg", size: 1024 })).toBeNull();
    expect(validateProductImageMetadata({ type: "image/webp", size: 5 * 1024 * 1024 })).toBeNull();
  });

  it("rejects empty, unsupported, and oversized files", () => {
    expect(validateProductImageMetadata({ type: "image/png", size: 0 })).toContain("اختر صورة");
    expect(validateProductImageMetadata({ type: "image/gif", size: 100 })).toContain("صيغة الصورة");
    expect(validateProductImageMetadata({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toContain("5MB");
  });

  it("checks file signatures instead of trusting the MIME type alone", () => {
    expect(hasValidProductImageSignature("image/png", new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    expect(hasValidProductImageSignature("image/png", new Uint8Array([0xff, 0xd8, 0xff]))).toBe(false);
    expect(hasValidProductImageSignature("image/webp", new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe(true);
  });
});
