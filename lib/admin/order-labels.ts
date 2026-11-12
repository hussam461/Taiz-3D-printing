export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار إثبات الدفع",
  in_production: "قيد التجهيز",
  completed: "مكتمل",
  cancelled: "ملغي",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "بانتظار السداد",
  proof_pending: "الإثبات بانتظار المراجعة",
  proof_approved: "تم اعتماد إثبات الدفع",
  proof_rejected: "رُفض إثبات الدفع",
};

export const PAYMENT_PROOF_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "معتمد",
  rejected: "مرفوض",
};

export const BALANCE_STATUS_LABELS: Record<string, string> = {
  not_due: "لا يوجد مبلغ متبقٍ",
  due: "المتبقي مستحق عند التسليم",
  paid: "تم تحصيل المتبقي",
  legacy_untracked: "طلب سابق — غير متابع ماليًا",
  cancelled_due: "لا يُحصّل المتبقي بعد الإلغاء",
};

export const ORDER_STATUS_KINDS: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  pending: "warning",
  in_production: "info",
  completed: "success",
  cancelled: "danger",
};

export const PAYMENT_STATUS_KINDS: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  unpaid: "warning",
  proof_pending: "info",
  proof_approved: "success",
  proof_rejected: "danger",
};

export const ORDER_STATUS_OPTIONS: Record<string, string> = {
  cancelled: "إلغاء الطلب",
};
