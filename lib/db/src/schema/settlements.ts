import {
  char,
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { settlementStatus } from "./enums";

export const settlements = pgTable(
  "settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    settlementReference: varchar("settlement_reference", { length: 100 })
      .notNull()
      .unique(),
    provider: varchar("provider", { length: 50 }).notNull(),
    providerSettlementId: varchar("provider_settlement_id", { length: 255 }),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    status: settlementStatus("status").notNull().default("PENDING"),
    settledAt: timestamp("settled_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    settlementRefIdx: uniqueIndex("idx_settlements_reference").on(
      table.settlementReference,
    ),
    providerIdx: index("idx_settlements_provider").on(table.provider),
    statusIdx: index("idx_settlements_status").on(table.status),
    settledAtIdx: index("idx_settlements_settled").on(table.settledAt),
  }),
);

export const insertSettlementSchema = createInsertSchema(settlements, {
  settlementReference: z.string().min(1).max(100),
  provider: z.string().min(1).max(50),
  providerSettlementId: z.string().max(255).nullable().optional(),
  amount: z.string(),
  currencyCode: z.string().length(3).default("INR"),
  exchangeRate: z.string().nullable().optional(),
  status: z.enum(["PENDING", "SETTLED", "FAILED"]).default("PENDING"),
  settledAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectSettlementSchema = createSelectSchema(settlements);

export type InsertSettlement = z.infer<typeof insertSettlementSchema>;
export type Settlement = typeof settlements.$inferSelect;
