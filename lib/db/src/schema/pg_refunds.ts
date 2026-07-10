import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pgRefundStatus } from "./enums";
import { pgPaymentIntents } from "./pg_payment_intents";

export const pgRefunds = pgTable(
  "pg_refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pgPaymentIntentId: uuid("pg_payment_intent_id")
      .notNull()
      .references(() => pgPaymentIntents.id),
    pgRefundId: varchar("pg_refund_id", { length: 255 }),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("INR"),
    status: pgRefundStatus("status").notNull().default("PENDING"),
    reason: text("reason"),
    gatewayResponse: text("gateway_response"),
    refundSpeed: varchar("refund_speed", { length: 50 }),
    initiatedBy: varchar("initiated_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pgPaymentIntentIdx: index("idx_pg_refunds_pg_pi").on(
      table.pgPaymentIntentId,
    ),
    pgRefundIdx: index("idx_pg_refunds_pg_refund").on(table.pgRefundId),
    statusIdx: index("idx_pg_refunds_status").on(table.status),
  }),
);

export const insertPgRefundSchema = createInsertSchema(pgRefunds, {
  pgPaymentIntentId: z.string().uuid(),
  pgRefundId: z.string().max(255).nullable().optional(),
  amount: z.string(),
  currency: z.string().max(3).default("INR"),
  status: z
    .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
    .default("PENDING"),
  reason: z.string().nullable().optional(),
  gatewayResponse: z.string().nullable().optional(),
  refundSpeed: z.string().max(50).nullable().optional(),
  initiatedBy: z.string().max(255).nullable().optional(),
});

export const selectPgRefundSchema = createSelectSchema(pgRefunds);

export type InsertPgRefund = z.infer<typeof insertPgRefundSchema>;
export type PgRefund = typeof pgRefunds.$inferSelect;
