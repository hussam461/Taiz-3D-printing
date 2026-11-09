export type BalanceStatus = "not_due" | "due" | "paid" | "legacy_untracked";

export function requiresBalanceCollection(
  status: string | null | undefined,
  remainingOldYer: number,
  orderStatus?: string | null,
): boolean {
  return status === "due" && remainingOldYer > 0 && orderStatus !== "cancelled";
}
