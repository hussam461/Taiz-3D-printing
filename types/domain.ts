export const PAYMENT_CURRENCIES = ["OLD_YER", "NEW_YER"] as const;
export type PaymentCurrency = (typeof PAYMENT_CURRENCIES)[number];

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "in_production",
  "ready",
  "shipped",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = [
  "unpaid",
  "proof_pending",
  "proof_approved",
  "proof_rejected",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PROOF_STATUSES = ["pending", "approved", "rejected"] as const;
export type ProofStatus = (typeof PROOF_STATUSES)[number];

export type Specification = { label: string; value: string };

export type MoneyOldYer = number;

export const DEFAULT_DEPOSIT_PERCENT = 30;
export const MAX_CART_QUANTITY = 9999;
export const MAX_PROOF_BYTES = 8 * 1024 * 1024;
export const ALLOWED_PROOF_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

export const LEGAL_SLUGS = [
  "about",
  "terms",
  "privacy",
  "payment-policy",
  "delivery-policy",
  "custom-orders-policy",
  "refund-policy",
] as const;
