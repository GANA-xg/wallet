export interface VaultUser {
  id: string;
  name: string;
  phone: string;
  balance: number;
  upiLite: number;
}

export type CardNetwork = "visa" | "mastercard" | "rupay" | "amex" | "diners" | "jcb" | "discover" | "unknown";

export interface CardRecord {
  id: string;
  userId: string;
  cardNetwork: CardNetwork;
  issuer: string | null;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
  nickname: string;
  theme: { gradientColors: string[] };
  frozen: boolean;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface UPIAccount {
  id: string;
  upiId: string;
  name: string;
  primary: boolean;
  bank: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  description: string;
  date: string;
  status: "success" | "pending" | "failed" | "launched" | "held" | "scheduled" | "rolled_back";
  merchant: string;
  payeeAddress?: string;
  launchedVia?: "google_pay" | "phonepe" | "paytm" | "generic";
}

export interface PaymentHold {
  id: string;
  amount: number;
  merchant: string;
  payeeAddress: string;
  note?: string;
  createdAt: string;
}

export interface ScheduledPayment {
  id: string;
  amount: number;
  merchant: string;
  payeeAddress: string;
  note?: string;
  scheduledFor: string;
  status: "scheduled" | "cancelled" | "completed";
}

export interface VaultDocument {
  id: string;
  type: "aadhaar" | "pan" | "driving_license" | "passport" | "vehicle_rc";
  name: string;
  number: string;
  expiry?: string;
}

export interface Ticket {
  id: string;
  type: "movie" | "flight" | "train" | "bus" | "event";
  title: string;
  venue?: string;
  from?: string;
  to?: string;
  date: string;
  pnr?: string;
  seat?: string;
  time?: string;
  transportType?: "train" | "flight" | "bus" | "metro" | "ferry";
  passengerName?: string;
  trainNumber?: string;
  trainName?: string;
  coach?: string;
  ticketStatus?: "confirmed" | "rac" | "wl" | "cancelled";
  qrCode?: string;
  stations?: string[];
  boardingPoint?: string;
  dropPoint?: string;
  isSmartTicket?: boolean;
  source?: string;
}

export interface SmartTicketInput {
  type: "train" | "flight" | "bus" | "metro" | "ferry";
  transportType: "train" | "flight" | "bus" | "metro" | "ferry";
  title?: string;
  passengerName?: string;
  pnr?: string;
  trainNumber?: string;
  trainName?: string;
  from?: string;
  to?: string;
  date: string;
  time?: string;
  coach?: string;
  seat?: string;
  ticketStatus?: "confirmed" | "rac" | "wl" | "cancelled";
  qrCode?: string;
  stations?: string[];
  source?: string;
}

export interface Reward {
  id: string;
  name: string;
  type: "points" | "coupon" | "cashback" | "offer";
  points?: number;
  discount?: string;
  expiry?: string;
  code?: string;
  brand: string;
  color: string;
}

export interface VaultNotification {
  id: string;
  title: string;
  body: string;
  type: "payment" | "reward" | "security" | "info";
  read: boolean;
  date: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
  month: string;
  color: string;
}

export interface ReservedAmount {
  id: string;
  label: string;
  amount: number;
  category: string;
  dueDate?: string;
  recurring: boolean;
  interval?: "monthly" | "weekly" | "yearly";
  color: string;
}

export interface TransportPass {
  id: string;
  type: "metro" | "bus" | "monthly" | "student";
  name: string;
  balance: number;
  expiry: string;
  cardNumber: string;
  gradientColors: [string, string];
  city: string;
}
