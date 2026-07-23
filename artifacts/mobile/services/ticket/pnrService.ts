import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { SmartTicketInput } from "@/types";

export interface PNRParseResult {
  success: boolean;
  data?: Partial<SmartTicketInput>;
  error?: string;
}

const API_BASE_KEY = "@vault_api_base";

async function getBaseUrl(): Promise<string> {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");

  try {
    const stored = await AsyncStorage.getItem(API_BASE_KEY);
    if (stored) return stored.replace(/\/+$/, "");
  } catch {}

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const host = hostUri.split(":")[0];
    return `http://${host}:3001`;
  }

  return "";
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

  // Try live PNR API first if credentials are configured
  const liveApiKey = process.env.EXPO_PUBLIC_PNR_API_KEY;
  const liveApiHost = process.env.EXPO_PUBLIC_PNR_API_HOST;
  if (liveApiKey && liveApiHost) {
    const liveResult = await fetchLivePNR(pnr, liveApiKey, liveApiHost);
    if (liveResult) return liveResult;
  }

  // Fallback to internal backend
  try {
    const baseUrl = await getBaseUrl();
    const url = baseUrl
      ? `${baseUrl}/api/pnr/${pnr}`
      : `/api/pnr/${pnr}`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "Unknown error");
      return { success: false, error: `PNR lookup failed (${response.status}): ${text}` };
    }

    const result = await response.json();
    console.log("[PNR] Raw backend response:", JSON.stringify(result, null, 2));

    if (result.error) {
      return { success: false, error: result.error };
    }

    // Backend returns RailKit envelope: { success, data: { train, journey, passengers, ... } }
    // Unwrap the envelope so we can read nested fields
    const rk = result.data ?? result;
    console.log("[PNR] Unwrapped RailKit payload keys:", Object.keys(rk));
    console.log("[PNR] rk.train:", rk.train);
    console.log("[PNR] rk.journey:", rk.journey);
    console.log("[PNR] rk.passengers:", rk.passengers);

    const passenger0 = rk.passengers?.[0];
    const booking = passenger0?.booking;
    const current = passenger0?.current;
    const train = rk.train;
    const journey = rk.journey;

    const data: Partial<SmartTicketInput> = {
      type: "train",
      transportType: "train",
      pnr: pnr,
      trainNumber: train?.number ?? result.trainNumber ?? result.train_number,
      trainName: train?.name ?? result.trainName ?? result.train_name,
      from: journey?.source?.name
        ? journey.source.code
          ? `${journey.source.name} (${journey.source.code})`
          : journey.source.name
        : result.sourceStation ?? result.from,
      to: journey?.destination?.name
        ? journey.destination.code
          ? `${journey.destination.name} (${journey.destination.code})`
          : journey.destination.name
        : result.destinationStation ?? result.to,
      date: extractDate(journey?.dateOfJourney) ?? result.journeyDate ?? result.date,
      time: extractTime(journey?.dateOfJourney) ?? result.departureTime ?? result.time,
      arrivalTime: extractTime(journey?.arrivalDate) ?? result.arrivalTime ?? result.arrival_time,
      coach: current?.coach ?? booking?.coach ?? result.coach ?? result.class,
      seat: current?.berthNo != null ? String(current.berthNo) : result.seatNumber ?? result.seat,
      passengerName: passenger0?.name ?? result.passengerName ?? result.passengers?.[0]?.name,
      ticketStatus: mapTicketStatus(
        current?.status ?? booking?.status ?? result.status ?? result.bookingStatus,
      ),
      stations: rk.stations ?? result.stations ?? result.routeStations,
      duration: journey?.travelTime ?? result.duration ?? result.journeyDuration,
      distance: journey?.distance != null ? `${journey.distance} km` : result.distance != null ? String(result.distance) : undefined,
      platform: current?.platform ?? result.platform ?? result.platformNumber,
      passengerAge: passenger0?.age ?? result.passengerAge ?? result.passengers?.[0]?.age,
      passengerGender: passenger0?.gender ?? result.passengerGender ?? result.passengers?.[0]?.gender,
      berthType: current?.berthCode ?? booking?.berthCode ?? result.berthType ?? result.berth_type,
      ticketClass: journey?.class ?? result.ticketClass ?? result.classType ?? result.reservationClass,
      bookingStatus: booking?.status ?? result.bookingStatus ?? result.booking_status,
      currentStatus: current?.status ?? result.currentStatus ?? result.current_status,
      trainStatus: rk.trainStatus ?? rk.chart?.status ?? result.trainStatus ?? result.train_status,
      runningStatus: rk.runningStatus ?? result.runningStatus ?? result.running_status,
      delay: current?.delay ?? result.delay ?? result.delayMinutes,
      expectedArrival: extractTime(journey?.arrivalDate) ?? result.expectedArrival ?? result.expected_arrival,
      expectedDeparture: extractTime(journey?.dateOfJourney) ?? result.expectedDeparture ?? result.expected_departure,
      stationTimes: rk.stationTimes ?? result.stationTimes ?? result.station_times,
    };

    console.log("[PNR] Mapped SmartTicketInput:", JSON.stringify(data, null, 2));
    return { success: true, data };
  } catch (error) {
    // Both live and backend failed — return mock data for dev/demo
    return getMockPNRResult(pnr);
  }
}

async function fetchLivePNR(
  pnr: string,
  apiKey: string,
  apiHost: string,
): Promise<PNRParseResult | null> {
  try {
    const url = `https://${apiHost}/api/pnr/${pnr}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
    });

    if (!response.ok) return null;

    const result = await response.json();

    if (result.error) return null;

    const data: Partial<SmartTicketInput> = {
      type: "train",
      transportType: "train",
      pnr: pnr,
      trainNumber: result.trainNumber ?? result.train_number ?? undefined,
      trainName: result.trainName ?? result.train_name ?? undefined,
      from: result.sourceStation ?? result.from ?? result.fromStation ?? undefined,
      to: result.destinationStation ?? result.to ?? result.destStation ?? undefined,
      date: result.journeyDate ?? result.date ?? undefined,
      time: result.departureTime ?? result.departure_time ?? result.time ?? undefined,
      arrivalTime: result.arrivalTime ?? result.arrival_time ?? result.arrival ?? undefined,
      coach: result.coach ?? result.class ?? result.coachClass ?? undefined,
      seat: result.seatNumber ?? result.seat ?? result.seatNumber_ ?? undefined,
      passengerName:
        result.passengerName ?? result.passengers?.[0]?.name ?? result.passenger_name ?? undefined,
      ticketStatus: mapTicketStatus(result.status ?? result.bookingStatus ?? result.booking_status),
      stations: result.stations ?? result.routeStations ?? result.route_stations ?? undefined,
      duration: result.duration ?? result.journeyDuration ?? undefined,
      distance: result.distance ?? result.totalDistance ?? undefined,
      platform: result.platform ?? result.platformNumber ?? undefined,
      passengerAge: result.passengerAge ?? result.passengers?.[0]?.age ?? undefined,
      passengerGender: result.passengerGender ?? result.passengers?.[0]?.gender ?? undefined,
      berthType: result.berthType ?? result.berth_type ?? undefined,
      ticketClass: result.ticketClass ?? result.classType ?? result.reservationClass ?? undefined,
      bookingStatus: result.bookingStatus ?? result.booking_status ?? undefined,
      currentStatus: result.currentStatus ?? result.current_status ?? undefined,
      trainStatus: result.trainStatus ?? result.train_status ?? undefined,
      runningStatus: result.runningStatus ?? result.running_status ?? undefined,
      delay: result.delay ?? result.delayMinutes ?? undefined,
      expectedArrival: result.expectedArrival ?? result.expected_arrival ?? undefined,
      expectedDeparture: result.expectedDeparture ?? result.expected_departure ?? undefined,
      stationTimes: result.stationTimes ?? result.station_times ?? undefined,
    };

    return { success: true, data };
  } catch {
    return null;
  }
}

function getMockPNRResult(pnr: string): PNRParseResult {
  const mockDate = new Date();
  mockDate.setDate(mockDate.getDate() + 7);
  const dateStr = mockDate.toISOString().split("T")[0];

  const data: Partial<SmartTicketInput> = {
    type: "train",
    transportType: "train",
    pnr,
    trainNumber: "12301",
    trainName: "Howrah Rajdhani Express",
    from: "New Delhi (NDLS)",
    to: "Howrah Junction (HWH)",
    date: dateStr,
    time: "16:55",
    arrivalTime: "09:55",
    coach: "B1",
    seat: "32",
    passengerName: "Passenger",
    ticketStatus: "confirmed",
    stations: [
      "New Delhi (NDLS)",
      "Kanpur Central (CNB)",
      "Mughal Sarai (MGS)",
      "Howrah Junction (HWH)",
    ],
    duration: "17h 00m",
    distance: "1,447 km",
    platform: "3",
    passengerAge: 28,
    passengerGender: "M",
    berthType: "LB",
    ticketClass: "3A",
    bookingStatus: "CNF",
    currentStatus: "CNF",
    trainStatus: "Running",
    runningStatus: "On Time",
    delay: "0 min",
    expectedArrival: "09:55",
    expectedDeparture: "16:55",
    stationTimes: {
      "New Delhi (NDLS)": { departure: "16:55" },
      "Kanpur Central (CNB)": { arrival: "21:10", departure: "21:15" },
      "Mughal Sarai (MGS)": { arrival: "02:45", departure: "02:50" },
      "Howrah Junction (HWH)": { arrival: "09:55" },
    },
  };

  return { success: true, data };
}

function mapTicketStatus(
  status?: string,
): "confirmed" | "rac" | "wl" | "cancelled" | undefined {
  if (!status) return undefined;
  const lower = status.toLowerCase();
  if (lower.includes("confirm") || lower === "cnf") return "confirmed";
  if (lower.includes("rac")) return "rac";
  if (lower.includes("wait") || lower.includes("wl")) return "wl";
  if (lower.includes("cancel")) return "cancelled";
  return "confirmed";
}

function extractDate(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  } catch {}
  return undefined;
}

function extractTime(dateStr?: string): string | undefined {
  if (!dateStr) return undefined;
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    }
  } catch {}
  return undefined;
}
