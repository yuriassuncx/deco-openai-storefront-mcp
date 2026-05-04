/** Format a number as currency using Intl.NumberFormat. */
export function formatPrice(
  value: number,
  currency = "USD",
  locale = "en-US",
): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

export function installmentLabel(
  inst: { count: number; value: number },
  currency = "USD",
  locale = "en-US",
): string {
  if (!Number.isFinite(inst.count) || !Number.isFinite(inst.value)) {
    return formatPrice(0, currency, locale);
  }
  if (inst.count <= 1) return formatPrice(inst.value, currency, locale);
  return `${inst.count}× ${formatPrice(inst.value, currency, locale)} interest-free`;
}
