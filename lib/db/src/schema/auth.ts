import {
  boolean,
  index,
  inet,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  deviceStatus,
  kycStatus,
  loginAttemptResult,
  sessionStatus,
} from "./enums";
import { tenants } from "./tenants";

// ──────────────────────────────────────────────
// Users
// ──────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 255 }),
    avatarUrl: text("avatar_url"),
    kycStatus: kycStatus("kyc_status").notNull().default("pending"),
    kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    biometricEnabled: boolean("biometric_enabled").notNull().default(true),
    pinHash: varchar("pin_hash", { length: 255 }),
    preferredLanguage: varchar("preferred_language", { length: 10 }).default(
      "en",
    ),
    isActive: boolean("is_active").notNull().default(true),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tenantPhoneIdx: uniqueIndex("idx_users_tenant_phone").on(
      table.tenantId,
      table.phone,
    ),
    tenantEmailIdx: uniqueIndex("idx_users_tenant_email").on(
      table.tenantId,
      table.email,
    ),
  }),
);



// ──────────────────────────────────────────────
// Registered Devices
// ──────────────────────────────────────────────

export const registeredDevices = pgTable(
  "registered_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    deviceName: varchar("device_name", { length: 255 }),
    deviceIdentifier: varchar("device_identifier", { length: 255 }).notNull(),
    deviceType: varchar("device_type", { length: 50 }),
    pushToken: text("push_token"),
    status: deviceStatus("status").notNull().default("active"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    enrolledAt: timestamp("enrolled_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    userDevicesIdx: index("idx_devices_user").on(table.userId, table.status),
    deviceIdentifierIdx: uniqueIndex("idx_devices_identifier").on(
      table.deviceIdentifier,
    ),
  }),
);



// ──────────────────────────────────────────────
// Sessions
// ──────────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    deviceId: uuid("device_id").references(() => registeredDevices.id),
    refreshTokenHash: varchar("refresh_token_hash", { length: 255 }),
    ipAddress: inet("ip_address"),
    userAgent: text("user_agent"),
    status: sessionStatus("status").notNull().default("active"),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: varchar("revoked_by", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    activeSessionsIdx: index("idx_sessions_active").on(table.userId),
    expiresAtIdx: index("idx_sessions_expires").on(table.expiresAt),
    validateIdx: index("idx_sessions_validate").on(
      table.userId,
      table.status,
    ),
  }),
);



// ──────────────────────────────────────────────
// Refresh Tokens
// ──────────────────────────────────────────────

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("idx_refresh_tokens_hash").on(table.tokenHash),
    sessionIdx: index("idx_refresh_tokens_session").on(table.sessionId),
  }),
);



// ──────────────────────────────────────────────
// Login Attempts
// ──────────────────────────────────────────────

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    phone: varchar("phone", { length: 20 }).notNull(),
    result: loginAttemptResult("result").notNull(),
    ipAddress: inet("ip_address"),
    deviceIdentifier: varchar("device_identifier", { length: 255 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    phoneAttemptsIdx: index("idx_login_attempts_phone").on(
      table.phone,
      table.createdAt,
    ),
  }),
);



// ──────────────────────────────────────────────
// Zod Schemas
// ──────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users, {
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid(),
  phone: z.string().min(10).max(20),
  email: z.string().email().nullable().optional(),
  name: z.string().max(255).nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  kycStatus: z
    .enum(["pending", "verified", "rejected", "expired"])
    .default("pending"),
  kycVerifiedAt: z.string().datetime().nullable().optional(),
  twoFactorEnabled: z.boolean().default(false),
  biometricEnabled: z.boolean().default(true),
  pinHash: z.string().nullable().optional(),
  preferredLanguage: z.string().max(10).default("en"),
  isActive: z.boolean().default(true),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectUserSchema = createSelectSchema(users);

export const insertSessionSchema = createInsertSchema(sessions, {
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  deviceId: z.string().uuid().nullable().optional(),
  refreshTokenHash: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
  status: z.enum(["active", "expired", "revoked"]).default("active"),
  lastActiveAt: z.string().datetime().optional(),
  expiresAt: z.string().datetime(),
  revokedAt: z.string().datetime().nullable().optional(),
  revokedBy: z.string().max(50).nullable().optional(),
});

export const selectSessionSchema = createSelectSchema(sessions);

export const insertDeviceSchema = createInsertSchema(registeredDevices, {
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  deviceName: z.string().max(255).nullable().optional(),
  deviceIdentifier: z.string().max(255),
  deviceType: z.string().max(50).nullable().optional(),
  pushToken: z.string().nullable().optional(),
  status: z.enum(["active", "revoked", "suspended"]).default("active"),
});

export const selectDeviceSchema = createSelectSchema(registeredDevices);

export const insertRefreshTokenSchema = createInsertSchema(refreshTokens, {
  id: z.string().uuid().optional(),
  sessionId: z.string().uuid(),
  tokenHash: z.string().max(255),
  expiresAt: z.string().datetime(),
  usedAt: z.string().datetime().nullable().optional(),
  replacedByTokenId: z.string().uuid().nullable().optional(),
});

export const selectRefreshTokenSchema = createSelectSchema(refreshTokens);

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts, {
  id: z.string().uuid().optional(),
  tenantId: z.string().uuid().nullable().optional(),
  phone: z.string().min(10).max(20),
  result: z.enum(["success", "invalid_otp", "rate_limited", "blocked"]),
  ipAddress: z.string().nullable().optional(),
  deviceIdentifier: z.string().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectLoginAttemptSchema = createSelectSchema(loginAttempts);

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type RegisteredDevice = typeof registeredDevices.$inferSelect;
export type InsertRegisteredDevice = z.infer<typeof insertDeviceSchema>;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type InsertRefreshToken = z.infer<typeof insertRefreshTokenSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
