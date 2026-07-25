import { pgEnum } from "drizzle-orm/pg-core";

// User enums
export const kycStatusEnum = pgEnum("kyc_status", ["pending", "verified", "rejected"]);
export const themePrefEnum = pgEnum("theme_pref", ["dark", "light", "system"]);

// Card enums
export const cardNetworkEnum = pgEnum("card_network", ["visa", "mastercard", "rupay"]);

// Transaction enums
export const transactionTypeEnum = pgEnum("transaction_type", ["credit", "debit"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "success", "failed", "reconciling"]);
export const transactionSourceEnum = pgEnum("transaction_source", ["upi_app", "card", "upi_lite", "nfc"]);

// Document enums
export const documentTypeEnum = pgEnum("document_type", ["aadhaar", "pan", "driving_license", "passport", "vehicle_rc"]);

// Ticket enums
export const ticketTypeEnum = pgEnum("ticket_type", ["flight", "train", "bus", "movie", "event"]);
export const ticketStatusEnum = pgEnum("ticket_status", ["upcoming", "completed", "cancelled"]);

// Reward enums
export const rewardTypeEnum = pgEnum("reward_type", ["points", "coupon", "cashback", "offer"]);

// Notification enums
export const notificationTypeEnum = pgEnum("notification_type", ["payment", "security", "reward", "info"]);

// Reserved amounts enums
export const recurringIntervalEnum = pgEnum("recurring_interval", ["monthly", "weekly", "yearly"]);

// Transport pass enums
export const transportPassTypeEnum = pgEnum("transport_pass_type", ["metro", "bus", "monthly", "student"]);

// Subscription enums
export const subscriptionCadenceEnum = pgEnum("subscription_cadence", ["monthly", "yearly"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled_by_user", "ignored"]);
