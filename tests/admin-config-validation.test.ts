import { describe, expect, it } from "vitest";
import { getLegalPageTemplate, isOriginalSeedLegalBody, parseLegalSections, serializeLegalSections } from "../lib/content/legal-pages";
import { parseDeliveryFee } from "../lib/validation/delivery-fee";

describe("delivery fee text entry", () => {
  it.each([
    ["2500", 2500],
    ["2,500 ريال قديم", 2500],
    ["٢٬٥٠٠ ريال يمني قديم", 2500],
    ["۲٬۵۰۰", 2500],
    ["0", 0],
    ["", 0],
  ])("parses %s into its numeric amount", (value, expected) => {
    expect(parseDeliveryFee(value)).toBe(expected);
  });

  it.each(["مجانًا", "2,5 ريال", "-200", "2.5", "999999999999999999999"]) (
    "rejects non-amount text %s",
    (value) => expect(parseDeliveryFee(value)).toBeNull(),
  );
});

describe("legal page templates", () => {
  it("provides templates for all current legal routes", () => {
    for (const slug of ["about", "terms", "privacy", "payment-policy", "delivery-policy", "custom-orders-policy", "refund-policy"]) {
      expect(getLegalPageTemplate(slug)?.sections.length).toBeGreaterThan(0);
    }
  });

  it("round trips structured headings and paragraphs", () => {
    const template = getLegalPageTemplate("terms");
    expect(template).not.toBeNull();
    const sections = template!.sections;
    expect(parseLegalSections(serializeLegalSections(sections))).toEqual(sections);
  });

  it("recognizes only the original short seed content as a starter", () => {
    expect(isOriginalSeedLegalBody("terms", "باستخدام المتجر توافق على تزويد بيانات تسليم صحيحة ورفع إثبات دفع مطابق للتحويل.")).toBe(true);
    expect(isOriginalSeedLegalBody("terms", "نص مخصص من مسؤول المتجر")).toBe(false);
  });
});
