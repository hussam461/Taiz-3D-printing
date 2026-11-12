export const ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: [],
  in_production: ["cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransition(from: string, to: string): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}
