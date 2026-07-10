import {
  char,
  index,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { upiMandateStatus, mandateFrequency } from "./enums";
import { upiHandles } from "./upi_handles";
import { paymentIntents } from "./payment_intents";

export const upiMandates = pgTable(
  "upi_mandates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payerHandleId: uuid("payer_handle_id")
      .notNull()
      .references(() => upiHandles.id),
    payeeHandleId: uuid("payee_handle_id")
      .notNull()
      .references(() => upiHandles.id),
    mandateReference: varchar("mandate_reference", { length: 255 })
      .notNull()
      .unique(),
    amount: numeric("amount", { precision: 15, scale: 2 }),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    frequency: mandateFrequency("frequency").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }),
    maxAmountPerTransaction: numeric("max_amount_per_transaction", {
      precision: 15,
      scale: 2,
    }),
    status: upiMandateStatus("status").notNull().default("active"),
    paymentIntentId: uuid("payment_intent_id").references(
      () => paymentIntents.id,
    ),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    mandateRefIdx: uniqueIndex("idx_upi_mandates_reference").on(
      table.mandateReference,
    ),
    payerIdx: index("idx_upi_mandates_payer").on(table.payerHandleId),
    payeeIdx: index("idx_upi_mandates_payee").on(table.payeeHandleId),
    statusIdx: index("idx_upi_mandates_status").on(table.status),
    paymentIntentIdx: index("idx_upi_mandates_intent").on(
      table.paymentIntentId,
    ),
    expiryIdx: index("idx_upi_mandates_expiry").on(table.endDate),
  }),
);

export const insertUpiMandateSchema = createInsertSchema(upiMandates, {
  payerHandleId: z.string().uuid(),
  payeeHandleId: z.string().uuid(),
  mandateReference: z.string().min(1).max(255),
  amount: z.string().nullable().optional(),
  currencyCode: z.string().length(3).default("INR"),
  frequency: z.enum([
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "YEARLY",
    "ONCE",
    "ADHOC",
  ]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
  maxAmountPerTransaction: z.string().nullable().optional(),
  status: z
    .enum(["active", "paused", "cancelled", "expired", "completed"])
    .default("active"),
  paymentIntentId: z.string().uuid().nullable().optional(),
  revokedAt: z.string().datetime().nullable().optional(),
});

export const selectUpiMandateSchema = createSelectSchema(upiMandates);

export type InsertUpiMandate = z.infer<typeof insertUpiMandateSchema>;
export type UpiMandate = typeof upiMandates.$inferSelect;
