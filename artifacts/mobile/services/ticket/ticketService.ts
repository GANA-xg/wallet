import AsyncStorage from "@react-native-async-storage/async-storage";

import type { SmartTicketInput, Ticket } from "@/types";

const TICKET_KEY = "@vault_tickets";

function generateId(): string {
  return "stk_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const TRANSPORT_ICONS: Record<string, string> = {
  train: "truck",
  flight: "navigation",
  bus: "map",
  metro: "crosshair",
  ferry: "anchor",
};

const TRANSPORT_COLORS: Record<string, string> = {
  train: "#22C55E",
  flight: "#3B82F6",
  bus: "#F59E0B",
  metro: "#8B5CF6",
  ferry: "#06B6D4",
};

const TRANSPORT_GRADIENTS: Record<string, [string, string]> = {
  train: ["#0f3320", "#1a5c35"],
  flight: ["#0f2040", "#1e3a5f"],
  bus: ["#3d2700", "#5f3e0f"],
  metro: ["#200f40", "#3b1f5f"],
  ferry: ["#0f2f3f", "#1a4f5f"],
};

export function getTransportStyle(transportType?: string) {
  const type = transportType ?? "train";
  return {
    icon: TRANSPORT_ICONS[type] ?? "truck",
    color: TRANSPORT_COLORS[type] ?? "#22C55E",
    gradient: TRANSPORT_GRADIENTS[type] ?? ["#0f3320", "#1a5c35"],
  };
}

export function createSmartTicket(input: SmartTicketInput): Ticket {
  const id = generateId();
  const title =
    input.title ?? (input.from && input.to ? `${input.from} → ${input.to}` : `${input.transportType} Ticket`);

  const ticket: Ticket = {
    id,
    type: input.type as Ticket["type"],
    transportType: input.transportType,
    title,
    passengerName: input.passengerName,
    pnr: input.pnr,
    trainNumber: input.trainNumber,
    trainName: input.trainName,
    from: input.from,
    to: input.to,
    date: input.date,
    time: input.time,
    coach: input.coach,
    seat: input.seat,
    ticketStatus: input.ticketStatus ?? "confirmed",
    isSmartTicket: true,
    stations: input.stations,
    qrCode: input.qrCode ?? input.pnr ?? id,
    source: input.source,
  };

  return ticket;
}

export async function saveTicket(ticket: Ticket): Promise<Ticket[]> {
  const raw = await AsyncStorage.getItem(TICKET_KEY);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const updated = [ticket, ...tickets];
  await AsyncStorage.setItem(TICKET_KEY, JSON.stringify(updated));
  return updated;
}

export async function updateTicket(id: string, updates: Partial<Ticket>): Promise<Ticket[]> {
  const raw = await AsyncStorage.getItem(TICKET_KEY);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const updated = tickets.map((t) => (t.id === id ? { ...t, ...updates } : t));
  await AsyncStorage.setItem(TICKET_KEY, JSON.stringify(updated));
  return updated;
}

export async function removeTicket(id: string): Promise<Ticket[]> {
  const raw = await AsyncStorage.getItem(TICKET_KEY);
  const tickets: Ticket[] = raw ? JSON.parse(raw) : [];
  const updated = tickets.filter((t) => t.id !== id);
  await AsyncStorage.setItem(TICKET_KEY, JSON.stringify(updated));
  return updated;
}

export function formatStatus(status?: string): string {
  switch (status) {
    case "confirmed": return "Confirmed";
    case "rac": return "RAC";
    case "wl": return "WL";
    case "cancelled": return "Cancelled";
    default: return "Confirmed";
  }
}

export function getStatusColor(status?: string): string {
  switch (status) {
    case "confirmed": return "#22C55E";
    case "rac": return "#F59E0B";
    case "wl": return "#EF4444";
    case "cancelled": return "#6B7280";
    default: return "#22C55E";
  }
}
