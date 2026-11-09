export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار التأكيد",
  confirmed: "تم التأكيد",
  in_production: "قيد التجهيز",
  ready: "جاهز للتسليم",
  shipped: "قيد التسليم (طلب سابق)",
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
  approved: "تم اعتماد الإثبات",
  rejected: "تم رفض الإثبات",
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
  confirmed: "info",
  in_production: "info",
  ready: "info",
  shipped: "success",
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
  confirmed: "تأكيد الطلب",
  in_production: "بدء التجهيز",
  ready: "تجهيز الطلب للتسليم",
  cancelled: "إلغاء الطلب",
};
