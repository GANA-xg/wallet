export type CardNetwork = "visa" | "mastercard" | "rupay" | "amex" | "diners" | "jcb" | "discover" | "unknown";

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
