export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ["cancelled"],
  confirmed: ["in_production", "cancelled"],
  in_production: ["ready", "cancelled"],
  ready: ["cancelled"],
  shipped: [],
  completed: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
