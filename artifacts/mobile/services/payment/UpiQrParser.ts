import type { ParsedUpiQr } from "./types";

const UPI_SCHEME_PREFIX = /^upi:\/\/pay/i;

function decodeParam(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, " "));
  } catch {
    return value;
  }
}

function parseQueryString(query: string): Record<string, string> {
  const params: Record<string, string> = {};
  const normalized = query.startsWith("?") ? query.slice(1) : query;

  for (const segment of normalized.split("&")) {
    if (!segment) continue;
    const eqIndex = segment.indexOf("=");
    if (eqIndex === -1) {
      params[decodeParam(segment)] = "";
      continue;
    }
    const key = decodeParam(segment.slice(0, eqIndex));
    const value = decodeParam(segment.slice(eqIndex + 1));
    params[key] = value;
  }

  return params;
}

function extractQuery(raw: string): string | null {
  const trimmed = raw.trim();

  if (UPI_SCHEME_PREFIX.test(trimmed)) {
    const queryStart = trimmed.indexOf("?");
    return queryStart >= 0 ? trimmed.slice(queryStart + 1) : "";
  }

  if (trimmed.startsWith("pa=") || trimmed.includes("&pa=")) {
    return trimmed.startsWith("?") ? trimmed.slice(1) : trimmed;
  }

  return null;
}

function mapParams(params: Record<string, string>): ParsedUpiQr | null {
  const payeeAddress = params.pa?.trim();
  if (!payeeAddress) return null;

  return {
    payeeAddress,
    payeeName: params.pn?.trim() || undefined,
    merchantCode: params.mc?.trim() || undefined,
    amount: params.am?.trim() || undefined,
    currency: params.cu?.trim() || undefined,
    transactionNote: params.tn?.trim() || undefined,
    transactionId: params.tid?.trim() || undefined,
    transactionRef: params.tr?.trim() || undefined,
    raw: "",
  };
}

export function parseUpiQr(raw: string): ParsedUpiQr | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const query = extractQuery(trimmed);
  if (query === null) return null;

  const parsed = mapParams(parseQueryString(query));
  if (!parsed) return null;

  return { ...parsed, raw: trimmed };
}

export function isValidUpiId(upiId: string): boolean {
  return /^[\w.\-]{2,256}@[\w.\-]{2,64}$/.test(upiId.trim());
}

export function formatUpiAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  return amount.toFixed(2);
}
