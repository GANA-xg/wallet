import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pgCredentialStatus } from "./enums";
import { pgProviders } from "./pg_providers";
import { merchants } from "./merchants";

export const pgCredentials = pgTable(
  "pg_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pgProviderId: uuid("pg_provider_id")
      .notNull()
      .references(() => pgProviders.id),
    merchantId: uuid("merchant_id").references(() => merchants.id),
    label: varchar("label", { length: 100 }).notNull(),
    status: pgCredentialStatus("status").notNull().default("ACTIVE"),
    apiKey: varchar("api_key", { length: 500 }),
    apiSecret: varchar("api_secret", { length: 1000 }),
    merchantIdRef: varchar("merchant_id_ref", { length: 255 }),
    salt: varchar("salt", { length: 255 }),
    environment: varchar("environment", { length: 20 }).notNull().default("sandbox"),
    webhookSecret: varchar("webhook_secret", { length: 500 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index("idx_pg_creds_provider").on(table.pgProviderId),
    merchantIdx: index("idx_pg_creds_merchant").on(table.merchantId),
    statusIdx: index("idx_pg_creds_status").on(table.status),
    envIdx: index("idx_pg_creds_env").on(table.environment),
  }),
);

export const insertPgCredentialSchema = createInsertSchema(pgCredentials, {
  pgProviderId: z.string().uuid(),
  merchantId: z.string().uuid().nullable().optional(),
  label: z.string().min(1).max(100),
  status: z
    .enum(["ACTIVE", "INACTIVE", "EXPIRED", "REVOKED"])
    .default("ACTIVE"),
  apiKey: z.string().max(500).nullable().optional(),
  apiSecret: z.string().max(1000).nullable().optional(),
  merchantIdRef: z.string().max(255).nullable().optional(),
  salt: z.string().max(255).nullable().optional(),
  environment: z.string().max(20).default("sandbox"),
  webhookSecret: z.string().max(500).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  lastUsedAt: z.string().datetime().nullable().optional(),
});

export const selectPgCredentialSchema = createSelectSchema(pgCredentials);

export type InsertPgCredential = z.infer<typeof insertPgCredentialSchema>;
export type PgCredential = typeof pgCredentials.$inferSelect;
