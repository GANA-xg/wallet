import {
  char,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { paymentIntentStatus } from "./enums";
import { users } from "./auth";
import { wallets } from "./wallets";
import { merchants } from "./merchants";

export const paymentIntents = pgTable(
  "payment_intents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    merchantId: uuid("merchant_id").references(() => merchants.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    status: paymentIntentStatus("status").notNull().default("CREATED"),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    authorizedAt: timestamp("authorized_at", { withTimezone: true }),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    failureReason: text("failure_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_payment_intents_user").on(table.userId),
    walletIdIdx: index("idx_payment_intents_wallet").on(table.walletId),
    statusIdx: index("idx_payment_intents_status").on(table.status),
    idempotencyKeyIdx: uniqueIndex("idx_payment_intents_idempotency").on(
      table.idempotencyKey,
    ),
    merchantIdx: index("idx_payment_intents_merchant").on(table.merchantId),
    expiresAtIdx: index("idx_payment_intents_expires").on(table.expiresAt),
  }),
);

export const insertPaymentIntentSchema = createInsertSchema(paymentIntents, {
  userId: z.string().uuid(),
  walletId: z.string().uuid(),
  merchantId: z.string().uuid().nullable().optional(),
  amount: z.string(),
  currencyCode: z.string().length(3).default("INR"),
  exchangeRate: z.string().nullable().optional(),
  status: z
    .enum([
      "CREATED",
      "AUTHORIZED",
      "CAPTURED",
      "PROCESSING",
      "COMPLETED",
      "FAILED",
      "CANCELLED",
      "EXPIRED",
    ])
    .default("CREATED"),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  idempotencyKey: z.string().max(255).nullable().optional(),
  expiresAt: z.string().datetime(),
  authorizedAt: z.string().datetime().nullable().optional(),
  capturedAt: z.string().datetime().nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  failedAt: z.string().datetime().nullable().optional(),
  failureReason: z.string().nullable().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
});

export const selectPaymentIntentSchema = createSelectSchema(paymentIntents);

export type InsertPaymentIntent = z.infer<typeof insertPaymentIntentSchema>;
export type PaymentIntent = typeof paymentIntents.$inferSelect;
