import { pgEnum } from "drizzle-orm/pg-core";

// Auth Domain
export const kycStatus = pgEnum("kyc_status", [
  "pending",
  "verified",
  "rejected",
  "expired",
]);

export const sessionStatus = pgEnum("session_status", [
  "active",
  "expired",
  "revoked",
]);

export const deviceStatus = pgEnum("device_status", [
  "active",
  "revoked",
  "suspended",
]);

export const loginAttemptResult = pgEnum("login_attempt_result", [
  "success",
  "invalid_otp",
  "rate_limited",
  "blocked",
]);

// Wallet / Ledger Domain
export const accountTypeEnum = pgEnum("account_type", [
  "USER_AVAILABLE",
  "USER_RESERVED",
  "MERCHANT",
  "PLATFORM",
  "REWARD",
  "FEE",
  "ESCROW",
  "SETTLEMENT",
  "BANK_CLEARING",
  "SUSPENSE",
]);

export const walletStatus = pgEnum("wallet_status", [
  "active",
  "inactive",
  "frozen",
  "closed",
]);

export const ledgerEntryType = pgEnum("ledger_entry_type", [
  "debit",
  "credit",
]);

export const ledgerEntryStatus = pgEnum("ledger_entry_status", [
  "pending",
  "settled",
  "failed",
  "reversed",
]);

// Payment Domain
export const paymentIntentStatus = pgEnum("payment_intent_status", [
  "CREATED",
  "AUTHORIZED",
  "CAPTURED",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
  "EXPIRED",
]);

export const paymentHoldStatus = pgEnum("payment_hold_status", [
  "AUTHORIZED",
  "CAPTURED",
  "VOIDED",
  "EXPIRED",
]);

export const transactionStatus = pgEnum("transaction_status", [
  "PENDING",
  "SUCCESS",
  "FAILED",
]);

export const transactionType = pgEnum("transaction_type", [
  "PAYMENT",
  "REFUND",
  "TRANSFER",
  "WITHDRAWAL",
  "DEPOSIT",
  "FEE",
  "ADJUSTMENT",
]);

export const reconciliationStatus = pgEnum("reconciliation_status", [
  "MATCHED",
  "MISMATCHED",
  "PENDING",
  "DISPUTED",
]);

export const settlementStatus = pgEnum("settlement_status", [
  "PENDING",
  "SETTLED",
  "FAILED",
]);

export const recurringFrequency = pgEnum("recurring_frequency", [
  "DAILY",
  "WEEKLY",
  "BIWEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
]);

export const recurringStatus = pgEnum("recurring_status", [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
  "COMPLETED",
]);

export const retryPolicy = pgEnum("retry_policy", [
  "IMMEDIATE",
  "EXPONENTIAL",
  "FIXED_INTERVAL",
]);

// Card Domain
export const cardStatus = pgEnum("card_status", [
  "active",
  "frozen",
  "suspended",
  "cancelled",
  "expired",
]);

export const tokenStatus = pgEnum("token_status", [
  "active",
  "suspended",
  "expired",
  "rotated",
]);

// UPI Domain
export const upiHandleStatus = pgEnum("upi_handle_status", [
  "active",
  "inactive",
  "suspended",
  "released",
]);

export const upiMandateStatus = pgEnum("upi_mandate_status", [
  "active",
  "paused",
  "cancelled",
  "expired",
  "completed",
]);

export const upiCollectStatus = pgEnum("upi_collect_status", [
  "pending",
  "accepted",
  "rejected",
  "expired",
  "cancelled",
]);

export const mandateFrequency = pgEnum("mandate_frequency", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
  "ONCE",
  "ADHOC",
]);

// Beneficiary Domain
export const beneficiaryType = pgEnum("beneficiary_type", [
  "UPI",
  "WALLET",
  "BANK",
]);

export const beneficiaryVerificationStatus = pgEnum(
  "beneficiary_verification_status",
  ["pending", "verified", "failed"],
);

// Merchant Domain
export const merchantStatus = pgEnum("merchant_status", [
  "pending",
  "active",
  "suspended",
  "closed",
]);

export const merchantTerminalType = pgEnum("merchant_terminal_type", [
  "POS",
  "QR",
  "NFC",
  "ECOM",
]);

export const merchantTerminalStatus = pgEnum("merchant_terminal_status", [
  "active",
  "inactive",
  "suspended",
  "decommissioned",
]);

export const merchantSettlementSchedule = pgEnum(
  "merchant_settlement_schedule",
  ["T_1", "T_2", "T_PLUS_2", "WEEKLY", "MONTHLY"],
);

// Document / File Domain
export const documentCategoryCode = pgEnum("document_category_code", [
  "AADHAAR",
  "PAN",
  "PASSPORT",
  "DRIVING_LICENSE",
  "VOTER_ID",
  "ADDRESS_PROOF",
  "INCOME_PROOF",
  "BANK_STATEMENT",
  "RECEIPT",
  "BILL",
  "TICKET",
  "CUSTOM",
]);

export const documentStatus = pgEnum("document_status", [
  "UPLOADED",
  "PROCESSING",
  "OCR_COMPLETED",
  "UNDER_REVIEW",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
  "ARCHIVED",
]);

export const storageProvider = pgEnum("storage_provider", [
  "LOCAL",
  "AWS_S3",
  "GCS",
  "AZURE_BLOB",
]);

export const checksumAlgorithm = pgEnum("checksum_algorithm", [
  "SHA256",
  "SHA512",
  "MD5",
]);

export const encryptionAlgorithm = pgEnum("encryption_algorithm", [
  "AES256_GCM",
  "AES256_CBC",
]);

export const antivirusStatus = pgEnum("antivirus_status", [
  "PENDING",
  "SCANNING",
  "CLEAN",
  "INFECTED",
  "ERROR",
]);

export const ocrStatus = pgEnum("ocr_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const documentVerificationAction = pgEnum(
  "document_verification_action",
  [
    "VERIFIED",
    "REJECTED",
    "REQUESTED_REUPLOAD",
    "FLAGGED_FOR_REVIEW",
  ],
);

// Tickets Domain
export const ticketType = pgEnum("ticket_type", [
  "EVENT",
  "TRANSPORT",
  "MOVIE",
  "FLIGHT",
  "PARKING",
  "CUSTOM",
]);

export const ticketStatus = pgEnum("ticket_status", [
  "CREATED",
  "ACTIVE",
  "USED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
]);

export const ticketQrStatus = pgEnum("ticket_qr_status", [
  "ACTIVE",
  "USED",
  "EXPIRED",
  "REVOKED",
]);

export const ticketValidationMethod = pgEnum("ticket_validation_method", [
  "QR_SCAN",
  "NFC",
  "MANUAL",
  "API",
]);

export const ticketEventType = pgEnum("ticket_event_type", [
  "CREATED",
  "ACTIVATED",
  "VALIDATED",
  "USED",
  "EXPIRED",
  "CANCELLED",
  "REFUNDED",
  "TRANSFERRED",
]);

// Transport Domain
export const transportMode = pgEnum("transport_mode", [
  "BUS",
  "METRO",
  "TRAIN",
  "FERRY",
  "TRAM",
  "MONORAIL",
  "CAB",
  "RENTAL",
  "OTHER",
]);

export const transportOperatorStatus = pgEnum("transport_operator_status", [
  "ACTIVE",
  "INACTIVE",
  "SUSPENDED",
]);

export const metroCardStatus = pgEnum("metro_card_status", [
  "ACTIVE",
  "INACTIVE",
  "LOST",
  "STOLEN",
  "EXPIRED",
  "BLOCKED",
]);

export const metroPassType = pgEnum("metro_pass_type", [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "ANNUAL",
  "FLEX",
]);

export const metroTransactionType = pgEnum("metro_transaction_type", [
  "RIDE",
  "TOPUP",
  "REFUND",
  "ADJUSTMENT",
]);

export const metroTransactionStatus = pgEnum("metro_transaction_status", [
  "PENDING",
  "COMPLETED",
  "FAILED",
  "REVERSED",
]);

// Rewards Domain
export const rewardType = pgEnum("reward_type", [
  "CASHBACK",
  "POINTS",
  "VOUCHER",
  "PROMOTIONAL",
]);

export const rewardTransactionType = pgEnum("reward_transaction_type", [
  "EARNED",
  "REDEEMED",
  "EXPIRED",
  "ADJUSTED",
  "REVERSED",
]);

export const rewardStatus = pgEnum("reward_status", [
  "ACTIVE",
  "EXPIRED",
  "DISABLED",
  "ARCHIVED",
]);

// Payment Gateway Domain
export const pgProviderCode = pgEnum("pg_provider_code", [
  "RAZORPAY",
  "GPAY",
  "PHONEPE",
]);

export const pgCredentialStatus = pgEnum("pg_credential_status", [
  "ACTIVE",
  "INACTIVE",
  "EXPIRED",
  "REVOKED",
]);

export const pgPaymentStatus = pgEnum("pg_payment_status", [
  "PENDING",
  "AUTHORIZED",
  "CAPTURED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

export const pgWebhookEventStatus = pgEnum("pg_webhook_event_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);

export const pgRefundStatus = pgEnum("pg_refund_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]);
