import {
  char,
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
import { upiCollectStatus } from "./enums";
import { upiHandles } from "./upi_handles";
import { paymentIntents } from "./payment_intents";

export const upiCollectRequests = pgTable(
  "upi_collect_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    payerHandleId: uuid("payer_handle_id")
      .notNull()
      .references(() => upiHandles.id),
    payeeHandleId: uuid("payee_handle_id")
      .notNull()
      .references(() => upiHandles.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    note: text("note"),
    status: upiCollectStatus("status").notNull().default("pending"),
    paymentIntentId: uuid("payment_intent_id").references(
      () => paymentIntents.id,
    ),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    payerIdx: index("idx_upi_collect_payer").on(table.payerHandleId),
    payeeIdx: index("idx_upi_collect_payee").on(table.payeeHandleId),
    statusIdx: index("idx_upi_collect_status").on(table.status),
    paymentIntentIdx: index("idx_upi_collect_intent").on(
      table.paymentIntentId,
    ),
    expiresAtIdx: index("idx_upi_collect_expires").on(table.expiresAt),
  }),
);

export const insertUpiCollectRequestSchema = createInsertSchema(
  upiCollectRequests,
  {
    payerHandleId: z.string().uuid(),
    payeeHandleId: z.string().uuid(),
    amount: z.string(),
    currencyCode: z.string().length(3).default("INR"),
    note: z.string().nullable().optional(),
    status: z
      .enum(["pending", "accepted", "rejected", "expired", "cancelled"])
      .default("pending"),
    paymentIntentId: z.string().uuid().nullable().optional(),
    expiresAt: z.string().datetime(),
    acceptedAt: z.string().datetime().nullable().optional(),
    rejectedAt: z.string().datetime().nullable().optional(),
    rejectionReason: z.string().nullable().optional(),
  },
);

export const selectUpiCollectRequestSchema = createSelectSchema(
  upiCollectRequests,
);

export type InsertUpiCollectRequest = z.infer<
  typeof insertUpiCollectRequestSchema
>;
export type UpiCollectRequest = typeof upiCollectRequests.$inferSelect;
