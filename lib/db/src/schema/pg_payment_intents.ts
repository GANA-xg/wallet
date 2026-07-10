import {
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pgPaymentStatus } from "./enums";
import { pgProviders } from "./pg_providers";
import { pgCredentials } from "./pg_credentials";
import { paymentIntents } from "./payment_intents";

export const pgPaymentIntents = pgTable(
  "pg_payment_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id),
    pgProviderId: uuid("pg_provider_id")
      .notNull()
      .references(() => pgProviders.id),
    pgCredentialId: uuid("pg_credential_id")
      .notNull()
      .references(() => pgCredentials.id),
    pgPaymentId: varchar("pg_payment_id", { length: 255 }),
    pgOrderId: varchar("pg_order_id", { length: 255 }),
    pgPaymentMethod: varchar("pg_payment_method", { length: 100 }),
    status: pgPaymentStatus("status").notNull().default("PENDING"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("INR"),
    pgFee: numeric("pg_fee", { precision: 12, scale: 2 }),
    pgTax: numeric("pg_tax", { precision: 12, scale: 2 }),
    gatewayResponse: jsonb("gateway_response"),
    errorCode: varchar("error_code", { length: 100 }),
    errorMessage: text("error_message"),
    instrumentResponse: jsonb("instrument_response"),
    checkoutUrl: varchar("checkout_url", { length: 1024 }),
    paymentLinkId: varchar("payment_link_id", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    paymentIntentIdx: index("idx_pg_pi_payment_intent").on(
      table.paymentIntentId,
    ),
    providerIdx: index("idx_pg_pi_provider").on(table.pgProviderId),
    credIdx: index("idx_pg_pi_credential").on(table.pgCredentialId),
    pgPaymentIdx: index("idx_pg_pi_pg_payment").on(table.pgPaymentId),
    pgOrderIdx: index("idx_pg_pi_pg_order").on(table.pgOrderId),
    statusIdx: index("idx_pg_pi_status").on(table.status),
    linkIdx: index("idx_pg_pi_link").on(table.paymentLinkId),
  }),
);

export const insertPgPaymentIntentSchema = createInsertSchema(
  pgPaymentIntents,
  {
    paymentIntentId: z.string().uuid(),
    pgProviderId: z.string().uuid(),
    pgCredentialId: z.string().uuid(),
    pgPaymentId: z.string().max(255).nullable().optional(),
    pgOrderId: z.string().max(255).nullable().optional(),
    pgPaymentMethod: z.string().max(100).nullable().optional(),
    status: z
      .enum([
        "PENDING",
        "AUTHORIZED",
        "CAPTURED",
        "FAILED",
        "REFUNDED",
        "PARTIALLY_REFUNDED",
      ])
      .default("PENDING"),
    amount: z.string(),
    currency: z.string().max(3).default("INR"),
    pgFee: z.string().nullable().optional(),
    pgTax: z.string().nullable().optional(),
    gatewayResponse: z.record(z.string(), z.unknown()).nullable().optional(),
    errorCode: z.string().max(100).nullable().optional(),
    errorMessage: z.string().nullable().optional(),
    instrumentResponse: z
      .record(z.string(), z.unknown())
      .nullable()
      .optional(),
    checkoutUrl: z.string().max(1024).nullable().optional(),
    paymentLinkId: z.string().max(255).nullable().optional(),
  },
);

export const selectPgPaymentIntentSchema = createSelectSchema(
  pgPaymentIntents,
);

export type InsertPgPaymentIntent = z.infer<
  typeof insertPgPaymentIntentSchema
>;
export type PgPaymentIntent = typeof pgPaymentIntents.$inferSelect;
