import type { CardNetwork, IinEntry, ValidationResult } from "./types";

const IIN_TABLE: IinEntry[] = [
  { prefix: "4", network: "visa" },
  { prefix: "51", network: "mastercard" },
  { prefix: "52", network: "mastercard" },
  { prefix: "53", network: "mastercard" },
  { prefix: "54", network: "mastercard" },
  { prefix: "55", network: "mastercard" },
  { prefix: "2221", network: "mastercard" },
  { prefix: "2222", network: "mastercard" },
  { prefix: "2223", network: "mastercard" },
  { prefix: "2224", network: "mastercard" },
  { prefix: "2225", network: "mastercard" },
  { prefix: "2226", network: "mastercard" },
  { prefix: "2227", network: "mastercard" },
  { prefix: "2228", network: "mastercard" },
  { prefix: "2229", network: "mastercard" },
  { prefix: "223", network: "mastercard" },
  { prefix: "224", network: "mastercard" },
  { prefix: "225", network: "mastercard" },
  { prefix: "226", network: "mastercard" },
  { prefix: "227", network: "mastercard" },
  { prefix: "228", network: "mastercard" },
  { prefix: "229", network: "mastercard" },
  { prefix: "23", network: "mastercard" },
  { prefix: "24", network: "mastercard" },
  { prefix: "25", network: "mastercard" },
  { prefix: "26", network: "mastercard" },
  { prefix: "27", network: "mastercard" },
  { prefix: "270", network: "mastercard" },
  { prefix: "271", network: "mastercard" },
  { prefix: "2720", network: "mastercard" },
  { prefix: "34", network: "amex" },
  { prefix: "37", network: "amex" },
  { prefix: "6011", network: "discover" },
  { prefix: "65", network: "discover" },
  { prefix: "644", network: "discover" },
  { prefix: "645", network: "discover" },
  { prefix: "646", network: "discover" },
  { prefix: "647", network: "discover" },
  { prefix: "648", network: "discover" },
  { prefix: "649", network: "discover" },
  { prefix: "622", network: "discover" },
  { prefix: "2200", network: "rupay" },
  { prefix: "2201", network: "rupay" },
  { prefix: "2202", network: "rupay" },
  { prefix: "2203", network: "rupay" },
  { prefix: "2204", network: "rupay" },
  { prefix: "2205", network: "rupay" },
  { prefix: "2206", network: "rupay", issuer: "State Bank of India" },
  { prefix: "2207", network: "rupay" },
  { prefix: "2208", network: "rupay" },
  { prefix: "2209", network: "rupay" },
  { prefix: "508", network: "rupay" },
  { prefix: "606", network: "rupay" },
  { prefix: "607", network: "rupay" },
  { prefix: "608", network: "rupay" },
  { prefix: "627", network: "rupay" },
  { prefix: "652", network: "rupay" },
  { prefix: "653", network: "rupay" },
  { prefix: "81", network: "rupay" },
  { prefix: "82", network: "rupay" },
  { prefix: "83", network: "rupay" },
  { prefix: "84", network: "rupay" },
  { prefix: "85", network: "rupay" },
  { prefix: "86", network: "rupay" },
  { prefix: "87", network: "rupay" },
  { prefix: "88", network: "rupay" },
  { prefix: "89", network: "rupay" },
  { prefix: "6521", network: "rupay", issuer: "HDFC Bank" },
  { prefix: "6522", network: "rupay", issuer: "ICICI Bank" },
  { prefix: "508005", network: "rupay", issuer: "State Bank of India" },
  { prefix: "360", network: "diners" },
  { prefix: "38", network: "diners" },
  { prefix: "39", network: "diners" },
  { prefix: "3528", network: "jcb" },
  { prefix: "3529", network: "jcb" },
  { prefix: "3589", network: "jcb" },
];

export function stripNumber(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function formatCardNumber(raw: string): string {
  const digits = stripNumber(raw);
  const groups: string[] = [];
  for (let i = 0; i < digits.length; i += 4) {
    groups.push(digits.slice(i, i + 4));
  }
  return groups.join(" ");
}

export function luhnCheck(digits: string): boolean {
  const stripped = stripNumber(digits);
  if (!/^\d{13,19}$/.test(stripped)) return false;

  let sum = 0;
  let alternate = false;
  for (let i = stripped.length - 1; i >= 0; i--) {
    let n = parseInt(stripped[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export function detectCardNetwork(raw: string): {
  network: CardNetwork;
  issuer: string | null;
} {
  const digits = stripNumber(raw);

  const sorted = [...IIN_TABLE].sort((a, b) => b.prefix.length - a.prefix.length);

  for (const entry of sorted) {
    if (digits.startsWith(entry.prefix)) {
      return { network: entry.network === "diners" ? "unknown" : entry.network === "jcb" ? "unknown" : entry.network, issuer: entry.issuer ?? null };
    }
  }

  return { network: "unknown", issuer: null };
}

export function validateExpiry(month: number, year: number): boolean {
  if (!Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  if (year > currentYear + 30) return false;

  return true;
}

export function validateCardNumber(raw: string): {
  valid: boolean;
  stripped: string;
  formatted: string;
  network: CardNetwork;
  issuer: string | null;
  error?: string;
} {
  const stripped = stripNumber(raw);
  const formatted = formatCardNumber(raw);

  if (stripped.length < 13 || stripped.length > 19) {
    return { valid: false, stripped, formatted, network: "unknown", issuer: null, error: "Card number must be 13-19 digits" };
  }

  if (!luhnCheck(stripped)) {
    return { valid: false, stripped, formatted, network: "unknown", issuer: null, error: "Failed checksum validation" };
  }

  const { network, issuer } = detectCardNetwork(stripped);

  return { valid: true, stripped, formatted, network, issuer };
}

export function checkDuplicate(
  candidate: { lastFour: string; expiryMonth: number; expiryYear: number },
  existing: Array<{ lastFour: string; expiryMonth: number; expiryYear: number }>,
): { isDuplicate: boolean; matchedCard?: { lastFour: string } } {
  for (const card of existing) {
    if (
      card.lastFour === candidate.lastFour &&
      card.expiryMonth === candidate.expiryMonth &&
      card.expiryYear === candidate.expiryYear
    ) {
      return { isDuplicate: true, matchedCard: { lastFour: card.lastFour } };
    }
  }
  return { isDuplicate: false };
}

export function validateAll(
  cardNumber: string,
  holderName: string | null,
  expiryMonth: number,
  expiryYear: number,
): ValidationResult {
  const numberValidation = validateCardNumber(cardNumber);
  const expiryValid = validateExpiry(expiryMonth, expiryYear);

  const checks = {
    luhn: { passed: numberValidation.valid, formatted: numberValidation.formatted },
    expiry: { passed: expiryValid },
    scheme: { passed: numberValidation.network !== "unknown", network: numberValidation.network },
    issuer: { passed: numberValidation.issuer !== null, name: numberValidation.issuer ?? undefined },
    numberLength: { passed: numberValidation.stripped.length >= 13 && numberValidation.stripped.length <= 19 },
  };

  return {
    passed: checks.luhn.passed && checks.expiry.passed && checks.numberLength.passed,
    checks,
  };
}
