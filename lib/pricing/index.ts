import { DEFAULT_DEPOSIT_PERCENT, type PaymentCurrency } from "@/types/domain";

export type ProductPriceInput = {
  basePriceOldYer: number;
  discountPercent: number | null;
};

export type PricedProduct = {
  basePriceOldYer: number;
  discountPercent: number | null;
  unitFinalPriceOldYer: number;
};

export type CartLineInput = ProductPriceInput & {
  productId: string;
  quantity: number;
};

export type PricedLine = PricedProduct & {
  productId: string;
  quantity: number;
  lineTotalOldYer: number;
  discountAmountOldYer: number;
};

export type DeliveryConfig = {
  feeOldYer: number;
  freeDeliveryEnabled: boolean;
  freeDeliveryMinOldYer: number;
};

export type OrderTotals = {
  lines: PricedLine[];
  subtotalOldYer: number;
  discountTotalOldYer: number;
  deliveryFeeOldYer: number;
  freeDeliveryApplied: boolean;
  finalTotalOldYer: number;
  depositPercent: number;
  depositOldYer: number;
  remainingOldYer: number;
};

function assertNonNegativeInteger(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`قيمة غير صالحة: ${label}`);
  }
  return Math.round(value);
}

export function discountedUnitPrice(input: ProductPriceInput): PricedProduct {
  const base = assertNonNegativeInteger(input.basePriceOldYer, "السعر");
  const percent = input.discountPercent;
  if (percent == null) {
    return { basePriceOldYer: base, discountPercent: null, unitFinalPriceOldYer: base };
  }
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    throw new Error("نسبة الخصم غير صالحة");
  }
  const unitFinal = Math.round(base * (1 - percent / 100));
  return {
    basePriceOldYer: base,
    discountPercent: percent,
    unitFinalPriceOldYer: unitFinal,
  };
}

export function priceLines(lines: CartLineInput[]): PricedLine[] {
  return lines.map((line) => {
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new Error("الكمية يجب أن تكون رقمًا صحيحًا أكبر من صفر");
    }
    const priced = discountedUnitPrice(line);
    const lineTotal = priced.unitFinalPriceOldYer * line.quantity;
    const discountAmount =
      (priced.basePriceOldYer - priced.unitFinalPriceOldYer) * line.quantity;
    return {
      ...priced,
      productId: line.productId,
      quantity: line.quantity,
      lineTotalOldYer: lineTotal,
      discountAmountOldYer: discountAmount,
    };
  });
}

/**
 * Convert old Yemeni rial to new Yemeni rial.
 * Rate meaning: how many new rials equal one old rial.
 * new = round(old * newRialPerOldRial)
 */
export function convertOldToNew(amountOldYer: number, newRialPerOldRial: number): number {
  const oldAmount = assertNonNegativeInteger(amountOldYer, "المبلغ");
  if (!Number.isFinite(newRialPerOldRial) || newRialPerOldRial <= 0) {
    throw new Error("سعر التحويل غير صالح");
  }
  return Math.round(oldAmount * newRialPerOldRial);
}

export function amountInPaymentCurrency(
  amountOldYer: number,
  currency: PaymentCurrency,
  newRialPerOldRial: number,
): number {
  if (currency === "OLD_YER") return assertNonNegativeInteger(amountOldYer, "المبلغ");
  return convertOldToNew(amountOldYer, newRialPerOldRial);
}

export function calculateOrderTotals(input: {
  lines: CartLineInput[];
  delivery: DeliveryConfig;
  depositPercent?: number;
}): OrderTotals {
  const priced = priceLines(input.lines);
  const subtotal = priced.reduce((sum, line) => sum + line.basePriceOldYer * line.quantity, 0);
  const discountTotal = priced.reduce((sum, line) => sum + line.discountAmountOldYer, 0);
  const afterDiscount = priced.reduce((sum, line) => sum + line.lineTotalOldYer, 0);
  const freeDeliveryApplied =
    input.delivery.freeDeliveryEnabled &&
    afterDiscount >= input.delivery.freeDeliveryMinOldYer;
  const deliveryFee = freeDeliveryApplied
    ? 0
    : assertNonNegativeInteger(input.delivery.feeOldYer, "رسوم التوصيل");
  const finalTotal = afterDiscount + deliveryFee;
  const depositPercent = input.depositPercent ?? DEFAULT_DEPOSIT_PERCENT;
  if (!Number.isFinite(depositPercent) || depositPercent <= 0 || depositPercent > 100) {
    throw new Error("نسبة العربون غير صالحة");
  }
  const deposit = Math.round(finalTotal * (depositPercent / 100));
  const remaining = finalTotal - deposit;
  return {
    lines: priced,
    subtotalOldYer: subtotal,
    discountTotalOldYer: discountTotal,
    deliveryFeeOldYer: deliveryFee,
    freeDeliveryApplied,
    finalTotalOldYer: finalTotal,
    depositPercent,
    depositOldYer: deposit,
    remainingOldYer: remaining,
  };
}
