import type { PaymentCurrency } from "@/types/domain";

const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

export function toWesternDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(arabicDigits.indexOf(d)));
}

export function formatIntegerWestern(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

export function currencyLabel(code: PaymentCurrency): string {
  return code === "OLD_YER" ? "ر.ي قديم" : "ر.ي جديد";
}

export function formatMoney(amount: number, code: PaymentCurrency): string {
  return `${formatIntegerWestern(amount)} ${currencyLabel(code)}`;
}

export function formatOldYer(amount: number): string {
  return `${formatIntegerWestern(amount)} ر.ي قديم`;
}
