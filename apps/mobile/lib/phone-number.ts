const E164_PATTERN = /^\+[1-9]\d{7,14}$/;

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  const hasLeadingPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  return hasLeadingPlus ? `+${digits}` : digits;
}

export function isValidE164PhoneNumber(input: string): boolean {
  return E164_PATTERN.test(normalizePhoneNumber(input));
}
