import {
  boolean,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantSettlementSchedule } from "./enums";
import { merchants } from "./merchants";
import { accounts } from "./accounts";

export const merchantSettlements = pgTable(
  "merchant_settlements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    accountId: uuid("account_id").references(() => accounts.id),
    settlementAccountReference: varchar("settlement_account_reference", {
      length: 255,
    }).notNull(),
    settlementSchedule: merchantSettlementSchedule(
      "settlement_schedule",
    ).notNull(),
    minimumSettlementAmount: numeric("minimum_settlement_amount", {
      precision: 15,
      scale: 2,
    }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index("idx_merchant_settlements_merchant").on(
      table.merchantId,
    ),
    accountIdx: index("idx_merchant_settlements_account").on(table.accountId),
    activeIdx: index("idx_merchant_settlements_active").on(table.isActive),
  }),
);

export const insertMerchantSettlementSchema = createInsertSchema(
  merchantSettlements,
  {
    merchantId: z.string().uuid(),
    accountId: z.string().uuid().nullable().optional(),
    settlementAccountReference: z.string().min(1).max(255),
    settlementSchedule: z.enum(["T_1", "T_2", "T_PLUS_2", "WEEKLY", "MONTHLY"]),
    minimumSettlementAmount: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  },
);

export const selectMerchantSettlementSchema = createSelectSchema(
  merchantSettlements,
);

export type InsertMerchantSettlement = z.infer<
  typeof insertMerchantSettlementSchema
>;
export type MerchantSettlement = typeof merchantSettlements.$inferSelect;
