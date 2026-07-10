import {
  char,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { paymentHoldStatus } from "./enums";
import { paymentIntents } from "./payment_intents";
import { accounts } from "./accounts";

export const paymentHolds = pgTable(
  "payment_holds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    paymentIntentId: uuid("payment_intent_id")
      .notNull()
      .references(() => paymentIntents.id),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    status: paymentHoldStatus("status").notNull().default("AUTHORIZED"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    voidedAt: timestamp("voided_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    paymentIntentIdx: index("idx_holds_payment_intent").on(
      table.paymentIntentId,
    ),
    accountIdx: index("idx_holds_account").on(table.accountId),
    statusIdx: index("idx_holds_status").on(table.status),
    expiresAtIdx: index("idx_holds_expires").on(table.expiresAt),
  }),
);

export const insertPaymentHoldSchema = createInsertSchema(paymentHolds, {
  paymentIntentId: z.string().uuid(),
  accountId: z.string().uuid(),
  amount: z.string(),
  currencyCode: z.string().length(3).default("INR"),
  status: z
    .enum(["AUTHORIZED", "CAPTURED", "VOIDED", "EXPIRED"])
    .default("AUTHORIZED"),
  expiresAt: z.string().datetime(),
  capturedAt: z.string().datetime().nullable().optional(),
  voidedAt: z.string().datetime().nullable().optional(),
});

export const selectPaymentHoldSchema = createSelectSchema(paymentHolds);

export type InsertPaymentHold = z.infer<typeof insertPaymentHoldSchema>;
export type PaymentHold = typeof paymentHolds.$inferSelect;
