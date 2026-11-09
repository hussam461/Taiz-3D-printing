import { describe, expect, it } from "vitest";
import { requiresBalanceCollection } from "@/lib/orders/balance";

describe("balance collection at delivery", () => {
  it("tracks a positive balance until the customer receives the order", () => {
    expect(requiresBalanceCollection("due", 1)).toBe(true);
  });

  it("does not block orders with no remaining amount", () => {
    expect(requiresBalanceCollection("not_due", 0)).toBe(false);
    expect(requiresBalanceCollection("due", 0)).toBe(false);
  });

  it("allows a recorded payment and leaves legacy orders untracked", () => {
    expect(requiresBalanceCollection("paid", 100)).toBe(false);
    expect(requiresBalanceCollection("legacy_untracked", 100)).toBe(false);
  });

  it("does not collect the remaining balance after an order is cancelled", () => {
    expect(requiresBalanceCollection("due", 100, "cancelled")).toBe(false);
  });
});
