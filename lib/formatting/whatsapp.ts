export function whatsappNumber(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("967")) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `967${digits.slice(1)}`;
  if (/^7\d{8}$/.test(digits)) return `967${digits}`;
  return digits;
}
