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
import { transactionStatus, transactionType } from "./enums";
import { paymentIntents } from "./payment_intents";
import { users } from "./auth";
import { merchants } from "./merchants";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id),
    transactionReference: varchar("transaction_reference", { length: 100 })
      .notNull()
      .unique(),
    externalReference: varchar("external_reference", { length: 255 }),
    providerReference: varchar("provider_reference", { length: 255 }),
    reconciliationReference: varchar("reconciliation_reference", {
      length: 255,
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    merchantId: uuid("merchant_id").references(() => merchants.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    status: transactionStatus("status").notNull().default("PENDING"),
    type: transactionType("type").notNull(),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    paymentIntentIdx: index("idx_transactions_payment_intent").on(
      table.paymentIntentId,
    ),
    userIdx: index("idx_transactions_user").on(table.userId),
    merchantIdx: index("idx_transactions_merchant").on(table.merchantId),
    statusIdx: index("idx_transactions_status").on(table.status),
    typeIdx: index("idx_transactions_type").on(table.type),
    providerRefIdx: uniqueIndex("idx_transactions_provider_ref").on(
      table.providerReference,
    ),
    externalRefIdx: index("idx_transactions_external_ref").on(
      table.externalReference,
    ),
    reconciliationRefIdx: index("idx_transactions_reconciliation_ref").on(
      table.reconciliationReference,
    ),
  }),
);

export const insertTransactionSchema = createInsertSchema(transactions, {
  paymentIntentId: z.string().uuid(),
  transactionReference: z.string().min(1).max(100),
  externalReference: z.string().max(255).nullable().optional(),
  providerReference: z.string().max(255).nullable().optional(),
  reconciliationReference: z.string().max(255).nullable().optional(),
  userId: z.string().uuid(),
  merchantId: z.string().uuid().nullable().optional(),
  amount: z.string(),
  currencyCode: z.string().length(3).default("INR"),
  exchangeRate: z.string().nullable().optional(),
  status: z.enum(["PENDING", "SUCCESS", "FAILED"]).default("PENDING"),
  type: z.enum([
    "PAYMENT",
    "REFUND",
    "TRANSFER",
    "WITHDRAWAL",
    "DEPOSIT",
    "FEE",
    "ADJUSTMENT",
  ]),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectTransactionSchema = createSelectSchema(transactions);

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
