import {
  boolean,
  index,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accounts } from "./accounts";

export const settlementAccounts = pgTable(
  "settlement_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    accountHolderName: varchar("account_holder_name", { length: 255 }).notNull(),
    accountNumberLast4: varchar("account_number_last4", { length: 4 }).notNull(),
    bankName: varchar("bank_name", { length: 255 }).notNull(),
    ifscCode: varchar("ifsc_code", { length: 20 }),
    upiId: varchar("upi_id", { length: 255 }),
    isVerified: boolean("is_verified").notNull().default(false),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    accountIdx: index("idx_settlement_account").on(table.accountId),
    verifiedIdx: index("idx_settlement_verified").on(table.isVerified),
  }),
);

export const insertSettlementAccountSchema = createInsertSchema(
  settlementAccounts,
  {
    accountId: z.string().uuid(),
    accountHolderName: z.string().min(1).max(255),
    accountNumberLast4: z.string().length(4),
    bankName: z.string().min(1).max(255),
    ifscCode: z.string().max(20).nullable().optional(),
    upiId: z.string().max(255).nullable().optional(),
    isVerified: z.boolean().default(false),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  },
);

export const selectSettlementAccountSchema = createSelectSchema(
  settlementAccounts,
);

export type InsertSettlementAccount = z.infer<
  typeof insertSettlementAccountSchema
>;
export type SettlementAccount = typeof settlementAccounts.$inferSelect;
