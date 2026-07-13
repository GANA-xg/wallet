import type { SmartTicketInput } from "@/types";

export interface PNRParseResult {
  success: boolean;
  data?: Partial<SmartTicketInput>;
  error?: string;
}

const PNR_PATTERNS: Record<string, RegExp> = {
  pnr: /\b\d{10}\b/,
  trainNumber: /\b\d{4,5}\b/,
  date: /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/,
  time: /\b(\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?)\b/,
  seat: /(?:[A-Z]\d{1,2}\s*-\s*\d{1,3}\([A-Z]+\)|[A-Z]\d{1,3})/,
  coach: /\b(?:S|A|B|C|HA|HB)\d{1,2}\b/,
};

export function parseText(text: string): PNRParseResult {
  const data: Partial<SmartTicketInput> = {};
  let errors: string[] = [];

  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const pnrMatch = text.match(PNR_PATTERNS.pnr);
  if (pnrMatch) data.pnr = pnrMatch[0];
  else errors.push("No PNR number found");

  const trainMatch = text.match(PNR_PATTERNS.trainNumber);
  if (trainMatch) data.trainNumber = trainMatch[0];

  const dateMatch = text.match(PNR_PATTERNS.date);
  if (dateMatch) {
    const parts = dateMatch[1].split(/[/-]/);
    if (parts.length === 3) {
      const d = parts[0].padStart(2, "0");
      const m = parts[1].padStart(2, "0");
      const y = parts[2].length === 2 ? "20" + parts[2] : parts[2];
      data.date = `${y}-${m}-${d}`;
    }
  }

  const timeMatch = text.match(PNR_PATTERNS.time);
  if (timeMatch) data.time = timeMatch[1];

  const seatMatch = text.match(PNR_PATTERNS.seat);
  if (seatMatch) data.seat = seatMatch[0];

  const coachMatch = text.match(PNR_PATTERNS.coach);
  if (coachMatch) data.coach = coachMatch[0];

  if (lines.length >= 1 && !data.passengerName) {
    const nameLine = lines[0];
    if (/[A-Za-z]+\s+[A-Za-z]+/.test(nameLine) && nameLine.length < 50) {
      data.passengerName = nameLine;
    }
  }

  if (data.pnr) {
    return { success: true, data };
  }

  return { success: false, error: errors.join("; ") };
}

export function validatePNRFormat(pnr: string): string | null {
  const trimmed = pnr.trim();
  if (!trimmed) return "Please enter a PNR number.";
  if (!/^\d+$/.test(trimmed)) return "Invalid PNR Number";
  if (trimmed.length !== 10) return "Invalid PNR Number";
  return null;
}

export async function lookupPNR(pnr: string): Promise<PNRParseResult> {
  const formatError = validatePNRFormat(pnr);
  if (formatError) {
    return { success: false, error: formatError };
  }

  return {
    success: false,
    error: "Ticket details could not be verified.",
  };
}
