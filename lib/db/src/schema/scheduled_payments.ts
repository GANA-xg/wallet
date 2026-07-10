import {
  char,
  index,
  integer,
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
import { retryPolicy } from "./enums";
import { users } from "./auth";
import { wallets } from "./wallets";
import { paymentIntents } from "./payment_intents";

export const scheduledPayments = pgTable(
  "scheduled_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    paymentIntentId: uuid("payment_intent_id").references(
      () => paymentIntents.id,
    ),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(0),
    retryPolicy: retryPolicy("retry_policy"),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_scheduled_payments_user").on(table.userId),
    walletIdx: index("idx_scheduled_payments_wallet").on(table.walletId),
    scheduledAtIdx: index("idx_scheduled_payments_time").on(table.scheduledAt),
    statusIdx: index("idx_scheduled_payments_next_retry").on(
      table.nextRetryAt,
    ),
    paymentIntentIdx: index("idx_scheduled_payments_intent").on(
      table.paymentIntentId,
    ),
  }),
);

export const insertScheduledPaymentSchema = createInsertSchema(
  scheduledPayments,
  {
    userId: z.string().uuid(),
    walletId: z.string().uuid(),
    amount: z.string(),
    currencyCode: z.string().length(3).default("INR"),
    exchangeRate: z.string().nullable().optional(),
    scheduledAt: z.string().datetime(),
    executedAt: z.string().datetime().nullable().optional(),
    cancelledAt: z.string().datetime().nullable().optional(),
    paymentIntentId: z.string().uuid().nullable().optional(),
    retryCount: z.number().int().min(0).default(0),
    maxRetries: z.number().int().min(0).default(0),
    retryPolicy: z
      .enum(["IMMEDIATE", "EXPONENTIAL", "FIXED_INTERVAL"])
      .nullable()
      .optional(),
    nextRetryAt: z.string().datetime().nullable().optional(),
    description: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  },
);

export const selectScheduledPaymentSchema = createSelectSchema(
  scheduledPayments,
);

export type InsertScheduledPayment = z.infer<
  typeof insertScheduledPaymentSchema
>;
export type ScheduledPayment = typeof scheduledPayments.$inferSelect;
