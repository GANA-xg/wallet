export interface VaultUser {
  id: string;
  name: string;
  phone: string;
  balance: number;
  upiLite: number;
}

export interface VaultCard {
  id: string;
  name: string;
  number: string;
  expiry: string;
  cvv: string;
  type: "visa" | "mastercard" | "rupay";
  gradientColors: string[];
  balance: number;
  frozen: boolean;
  bank: string;
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
  status: "success" | "pending" | "failed" | "launched";
  merchant: string;
  payeeAddress?: string;
  launchedVia?: "google_pay" | "phonepe" | "paytm" | "generic";
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
