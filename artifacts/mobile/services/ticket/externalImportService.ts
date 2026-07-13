import type { SmartTicketInput } from "@/types";

export type ExternalSource = "irctc" | "railone" | "bus_booking" | "airline";

interface ExternalTicketData {
  source: ExternalSource;
  pnr?: string;
  passengerName?: string;
  trainNumber?: string;
  trainName?: string;
  flightNumber?: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  coach?: string;
  seat?: string;
  status?: string;
  stations?: string[];
  rawData?: string;
}

function validateExternalFields(data: ExternalTicketData, requiredFields: string[]): string | null {
  for (const field of requiredFields) {
    if (!(data as any)[field]) return `Missing required field: ${field}`;
  }
  return null;
}

function parseIRCTC(data: ExternalTicketData): { data?: Partial<SmartTicketInput>; error?: string } {
  const err = validateExternalFields(data, ["pnr", "passengerName", "from", "to", "date"]);
  if (err) return { error: err };
  return {
    data: {
      transportType: "train",
      type: "train",
      pnr: data.pnr,
      passengerName: data.passengerName,
      trainNumber: data.trainNumber,
      trainName: data.trainName,
      from: data.from,
      to: data.to,
      date: data.date,
      time: data.time,
      coach: data.coach,
      seat: data.seat,
      ticketStatus: (data.status as SmartTicketInput["ticketStatus"]) ?? "confirmed",
      stations: data.stations,
      source: "irctc",
    },
  };
}

function parseRailOne(data: ExternalTicketData): { data?: Partial<SmartTicketInput>; error?: string } {
  const err = validateExternalFields(data, ["pnr", "passengerName", "from", "to", "date"]);
  if (err) return { error: err };
  return {
    data: {
      transportType: "train",
      type: "train",
      pnr: data.pnr,
      passengerName: data.passengerName,
      trainNumber: data.trainNumber,
      trainName: data.trainName,
      from: data.from,
      to: data.to,
      date: data.date,
      time: data.time,
      coach: data.coach,
      seat: data.seat,
      ticketStatus: (data.status as SmartTicketInput["ticketStatus"]) ?? "confirmed",
      source: "railone",
    },
  };
}

function parseBusBooking(data: ExternalTicketData): { data?: Partial<SmartTicketInput>; error?: string } {
  const err = validateExternalFields(data, ["pnr", "passengerName", "from", "to", "date"]);
  if (err) return { error: err };
  return {
    data: {
      transportType: "bus",
      type: "bus",
      pnr: data.pnr,
      passengerName: data.passengerName,
      from: data.from,
      to: data.to,
      date: data.date,
      time: data.time,
      seat: data.seat,
      ticketStatus: "confirmed",
      source: "bus_booking",
    },
  };
}

function parseAirline(data: ExternalTicketData): { data?: Partial<SmartTicketInput>; error?: string } {
  const err = validateExternalFields(data, ["pnr", "passengerName", "from", "to", "date"]);
  if (err) return { error: err };
  return {
    data: {
      transportType: "flight",
      type: "flight",
      pnr: data.pnr,
      passengerName: data.passengerName,
      trainNumber: data.flightNumber,
      trainName: data.trainName,
      from: data.from,
      to: data.to,
      date: data.date,
      time: data.time,
      seat: data.seat,
      ticketStatus: "confirmed",
      source: "airline",
    },
  };
}

export function parseExternalTicket(data: ExternalTicketData): { data?: Partial<SmartTicketInput>; error?: string } {
  switch (data.source) {
    case "irctc": return parseIRCTC(data);
    case "railone": return parseRailOne(data);
    case "bus_booking": return parseBusBooking(data);
    case "airline": return parseAirline(data);
    default: return { error: "Unknown external source: " + data.source };
  }
}

export function addTicketFromExternal(
  source: ExternalSource,
  ticketData: ExternalTicketData,
): { success: boolean; ticket?: Partial<SmartTicketInput>; error?: string } {
  const validated: ExternalTicketData = { ...ticketData, source };

  if (!validated.pnr && !validated.passengerName) {
    return { success: false, error: "Missing required ticket data (PNR or passenger name)" };
  }

  const result = parseExternalTicket(validated);

  if (result.error || !result.data) {
    return { success: false, error: result.error ?? "Could not parse ticket from source: " + source };
  }

  if (!result.data.transportType) {
    return { success: false, error: "Could not parse ticket from source: " + source };
  }

  return { success: true, ticket: result.data };
}
