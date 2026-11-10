const MAX_VND_DIGITS = 19;

export const sanitizeVndInput = (value: string): string =>
  value.replace(/\D/g, "").slice(0, MAX_VND_DIGITS) || "0";

export const formatVnd = (value?: string | null): string => {
  const digits = sanitizeVndInput(value ?? "0");
  return new Intl.NumberFormat("vi-VN").format(BigInt(digits));
};
