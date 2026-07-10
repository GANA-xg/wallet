import {
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { recurringFrequency, recurringStatus } from "./enums";
import { users } from "./auth";
import { wallets } from "./wallets";
import { scheduledPayments } from "./scheduled_payments";

export const recurringPayments = pgTable(
  "recurring_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    scheduledPaymentId: uuid("scheduled_payment_id").references(
      () => scheduledPayments.id,
    ),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    frequency: recurringFrequency("frequency").notNull(),
    intervalCount: integer("interval_count").notNull().default(1),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    nextExecutionAt: timestamp("next_execution_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastExecutionAt: timestamp("last_execution_at", { withTimezone: true }),
    status: recurringStatus("status").notNull().default("ACTIVE"),
    maxOccurrences: integer("max_occurrences"),
    occurrencesCount: integer("occurrences_count").notNull().default(0),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_recurring_payments_user").on(table.userId),
    walletIdx: index("idx_recurring_payments_wallet").on(table.walletId),
    statusIdx: index("idx_recurring_payments_status").on(table.status),
    nextExecutionIdx: index("idx_recurring_payments_next").on(
      table.nextExecutionAt,
    ),
    scheduledPaymentIdx: index("idx_recurring_payments_template").on(
      table.scheduledPaymentId,
    ),
  }),
);

export const insertRecurringPaymentSchema = createInsertSchema(
  recurringPayments,
  {
    userId: z.string().uuid(),
    walletId: z.string().uuid(),
    scheduledPaymentId: z.string().uuid().nullable().optional(),
    amount: z.string(),
    currencyCode: z.string().length(3).default("INR"),
    exchangeRate: z.string().nullable().optional(),
    frequency: z.enum([
      "DAILY",
      "WEEKLY",
      "BIWEEKLY",
      "MONTHLY",
      "QUARTERLY",
      "YEARLY",
    ]),
    intervalCount: z.number().int().min(1).default(1),
    startAt: z.string().datetime(),
    endAt: z.string().datetime().nullable().optional(),
    nextExecutionAt: z.string().datetime(),
    lastExecutionAt: z.string().datetime().nullable().optional(),
    status: z
      .enum(["ACTIVE", "PAUSED", "CANCELLED", "COMPLETED"])
      .default("ACTIVE"),
    maxOccurrences: z.number().int().min(1).nullable().optional(),
    occurrencesCount: z.number().int().min(0).default(0),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  },
);

export const selectRecurringPaymentSchema = createSelectSchema(
  recurringPayments,
);

export type InsertRecurringPayment = z.infer<
  typeof insertRecurringPaymentSchema
>;
export type RecurringPayment = typeof recurringPayments.$inferSelect;
