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
  arrivalTime?: string;
  duration?: string;
  distance?: string;
  platform?: string;
  passengerAge?: number;
  passengerGender?: string;
  berthType?: string;
  ticketClass?: string;
  bookingStatus?: string;
  currentStatus?: string;
  trainStatus?: string;
  runningStatus?: string;
  delay?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  stationTimes?: Record<string, { arrival?: string; departure?: string }>;
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
  arrivalTime?: string;
  duration?: string;
  distance?: string;
  platform?: string;
  passengerAge?: number;
  passengerGender?: string;
  berthType?: string;
  ticketClass?: string;
  bookingStatus?: string;
  currentStatus?: string;
  trainStatus?: string;
  runningStatus?: string;
  delay?: string;
  expectedArrival?: string;
  expectedDeparture?: string;
  stationTimes?: Record<string, { arrival?: string; departure?: string }>;
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

// ── Card scanning types (migrated from services/cards/types.ts) ──

export type CardErrorCode =
  | "camera_permission_denied"
  | "camera_unavailable"
  | "capture_failed"
  | "quality_blur"
  | "quality_low_light"
  | "quality_glare"
  | "quality_positioning"
  | "quality_orientation"
  | "ocr_failed"
  | "ocr_no_text_found"
  | "validation_luhn_failed"
  | "validation_expired"
  | "validation_scheme_unknown"
  | "validation_number_incomplete"
  | "validation_name_missing"
  | "duplicate_card"
  | "storage_encryption_failed"
  | "backend_sync_failed"
  | "unknown";

export interface CardError {
  code: CardErrorCode;
  message: string;
  retryable: boolean;
  suggestion?: string;
}

export interface QualityCheckResult {
  passed: boolean;
  checks: {
    blur: { passed: boolean; score: number; threshold: number };
    lowLight: { passed: boolean; score: number; threshold: number };
    glare: { passed: boolean; score: number; threshold: number };
    orientation: { passed: boolean; aspectRatio: number };
    positioning: { passed: boolean };
  };
}

export interface OcrField<T = string> {
  value: T | null;
  confidence: number;
}

export interface OcrResult {
  cardNumber: OcrField<string>;
  holderName: OcrField<string>;
  expiryMonth: OcrField<number>;
  expiryYear: OcrField<number>;
  rawText: string;
  overallConfidence: number;
}

export interface ValidationResult {
  passed: boolean;
  checks: {
    luhn: { passed: boolean; formatted?: string };
    expiry: { passed: boolean };
    scheme: { passed: boolean; network?: CardNetwork };
    issuer: { passed: boolean; name?: string };
    numberLength: { passed: boolean };
  };
}

export interface OcrReviewData {
  cardNumber: string;
  cardNetwork: CardNetwork;
  issuer: string | null;
  holderName: string | null;
  expiryMonth: number;
  expiryYear: number;
  rawConfidence: number;
  lowConfidenceFields: string[];
}

export interface ScanSession {
  state: ScanState;
  error: CardError | null;
  qualityResults: QualityCheckResult | null;
  ocrResult: OcrResult | null;
  reviewData: OcrReviewData | null;
  validatedCard: ValidatedCard | null;
  retryCount: number;
}

export type ScanState =
  | "idle"
  | "ready"
  | "capturing"
  | "quality_check"
  | "quality_failed"
  | "processing"
  | "review"
  | "confirmed"
  | "done"
  | "error";

export interface ValidatedCard {
  cardNetwork: CardNetwork;
  issuer: string | null;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface IinEntry {
  prefix: string;
  network: CardNetwork;
  issuer?: string;
}

export type CardAnalyticsEvent =
  | { event: "card_onboarding_started"; payload: { method: "scan" | "manual" } }
  | { event: "card_scan_captured"; payload: {} }
  | { event: "card_scan_quality_failed"; payload: { reasons: string[]; retryCount: number } }
  | { event: "card_scan_ocr_completed"; payload: { confidence: number; fieldsFound: number } }
  | { event: "card_scan_validation_failed"; payload: { reasons: string[] } }
  | { event: "card_scan_confirmed"; payload: { network: CardNetwork; source: "scan" | "manual" } }
  | { event: "card_duplicate_detected"; payload: {} }
  | { event: "card_added"; payload: { network: CardNetwork; source: "scan" | "manual" } }
  | { event: "card_removed"; payload: {} };
