import { describe, expect, it } from "vitest";
import {
  amountInPaymentCurrency,
  calculateOrderTotals,
  convertOldToNew,
  discountedUnitPrice,
} from "../lib/pricing";

describe("pricing", () => {
  it("applies a percentage discount and rounds to integer rials", () => {
    const priced = discountedUnitPrice({ basePriceOldYer: 10000, discountPercent: 10 });
    expect(priced.unitFinalPriceOldYer).toBe(9000);
  });

  it("uses free delivery when the after-discount subtotal meets the threshold", () => {
    const totals = calculateOrderTotals({
      lines: [{ productId: "a", quantity: 2, basePriceOldYer: 30000, discountPercent: 10 }],
      delivery: { feeOldYer: 4000, freeDeliveryEnabled: true, freeDeliveryMinOldYer: 50000 },
      depositPercent: 30,
    });
    expect(totals.subtotalOldYer).toBe(60000);
    expect(totals.discountTotalOldYer).toBe(6000);
    expect(totals.freeDeliveryApplied).toBe(true);
    expect(totals.deliveryFeeOldYer).toBe(0);
    expect(totals.finalTotalOldYer).toBe(54000);
    expect(totals.depositOldYer).toBe(16200);
    expect(totals.remainingOldYer).toBe(37800);
  });

  it("keeps delivery fee when the offer is disabled", () => {
    const totals = calculateOrderTotals({
      lines: [{ productId: "a", quantity: 1, basePriceOldYer: 1000, discountPercent: null }],
      delivery: { feeOldYer: 2000, freeDeliveryEnabled: false, freeDeliveryMinOldYer: 1 },
    });
    expect(totals.deliveryFeeOldYer).toBe(2000);
    expect(totals.finalTotalOldYer).toBe(3000);
  });

  it("converts old rial to new rial using new rials per old rial", () => {
    expect(convertOldToNew(1, 3)).toBe(3);
    expect(convertOldToNew(50000, 3)).toBe(150000);
    expect(convertOldToNew(50000, 50)).toBe(2500000);
    expect(amountInPaymentCurrency(50000, "OLD_YER", 3)).toBe(50000);
    expect(amountInPaymentCurrency(50000, "NEW_YER", 3)).toBe(150000);
  });
});
