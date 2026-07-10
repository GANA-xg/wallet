import {
  boolean,
  char,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { wallets } from "./wallets";
import { accountTypes } from "./account_types";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    accountTypeId: uuid("account_type_id")
      .notNull()
      .references(() => accountTypes.id),
    label: varchar("label", { length: 255 }),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("INR"),
    balance: numeric("balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    version: integer("version").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    walletTypeIdx: uniqueIndex("idx_accounts_wallet_type").on(
      table.walletId,
      table.accountTypeId,
    ),
    activeIdx: index("idx_accounts_active").on(
      table.walletId,
      table.isActive,
    ),
    balanceIdx: index("idx_accounts_balance").on(table.balance),
  }),
);

export const insertAccountSchema = createInsertSchema(accounts, {
  walletId: z.string().uuid(),
  accountTypeId: z.string().uuid(),
  label: z.string().max(255).nullable().optional(),
  currencyCode: z.string().length(3).default("INR"),
  balance: z.string().default("0"),
  version: z.number().int().positive().default(1),
  isActive: z.boolean().default(true),
});

export const selectAccountSchema = createSelectSchema(accounts);

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;
