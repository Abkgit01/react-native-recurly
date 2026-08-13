export function formatCurrency(
  value: number | string,
  currency = "USD",
): string {
  const amount = Number(value);
  const normalizedAmount = Number.isFinite(amount) ? amount : 0;

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(normalizedAmount);
  } catch {
    return `$${normalizedAmount.toFixed(2)}`;
  }
}

export function formatSubscriptionDate(value?: string): string {
  if (!value) return "Not provided";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not provided";

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  }).format(date);
}

export function formatStatusLabel(value?: string): string {
  if (!value) return "Unknown";

  return value.charAt(0).toUpperCase() + value.slice(1);
}
