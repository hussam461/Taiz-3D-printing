const MAX_DELIVERY_FEE = 99_999_999_999_999;

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

/** Converts an amount typed as text into the numeric value used by order totals. */
export function parseDeliveryFee(value: string): number | null {
  if (value.trim() === "") return 0;

  const normalized = normalizeDigits(value)
    .trim()
    .replace(/\s*ريال(?:\s+يمني)?(?:\s+قديم)?\s*$/u, "")
    .trim();

  // Accept plain digits or correctly grouped thousands. Reject malformed
  // separators such as "2,5", which would otherwise silently become 25.
  if (!/^\d+$/.test(normalized) && !/^\d{1,3}(?:[٬,\s]\d{3})+$/.test(normalized)) return null;
  const digitsOnly = normalized.replace(/[٬,\s]/g, "");
  const amount = Number(digitsOnly);
  if (!Number.isSafeInteger(amount) || amount < 0 || amount > MAX_DELIVERY_FEE) return null;
  return amount;
}
