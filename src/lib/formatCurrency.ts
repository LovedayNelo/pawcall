/**
 * Naira formatting utilities.
 * Money is stored as integer minor units (kobo).
 */

export const CURRENCY = process.env.CURRENCY ?? "NGN";

export function formatKobo(kobo: number): string {
  if (kobo < 0) return `-₦${(Math.abs(kobo) / 100).toFixed(2)}`;
  return `₦${(kobo / 100).toFixed(2)}`;
}

export function formatKoboInput(e: React.ChangeEvent<HTMLInputElement>): string {
  const value = e.target.value.replace(/[^0-9]/g, "");
  if (!value) return "";
  const kobo = parseInt(value, 10);
  return formatKobo(kobo);
}
