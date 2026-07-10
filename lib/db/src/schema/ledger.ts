import {
  char,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ledgerEntryType, ledgerEntryStatus } from "./enums";
import { accounts } from "./accounts";

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id),
    entryType: ledgerEntryType("entry_type").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    balanceBefore: numeric("balance_before", { precision: 15, scale: 2 }).notNull(),
    balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 10, scale: 6 }),
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    referenceId: uuid("reference_id").notNull(),
    reversalEntryId: uuid("reversal_entry_id"),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    accountEntriesIdx: index("idx_ledger_account").on(table.accountId),
    referenceIdx: index("idx_ledger_reference").on(
      table.referenceType,
      table.referenceId,
    ),
    reversalIdx: index("idx_ledger_reversal").on(table.reversalEntryId),
    createdAtIdx: index("idx_ledger_created").on(table.createdAt),
  }),
);

export const insertLedgerEntrySchema = createInsertSchema(ledgerEntries, {
  accountId: z.string().uuid(),
  entryType: z.enum(["debit", "credit"]),
  amount: z.string(),
  currencyCode: z.string().length(3).default("INR"),
  balanceBefore: z.string(),
  balanceAfter: z.string(),
  exchangeRate: z.string().nullable().optional(),
  referenceType: z.string().min(1).max(50),
  referenceId: z.string().uuid(),
  reversalEntryId: z.string().uuid().nullable().optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectLedgerEntrySchema = createSelectSchema(ledgerEntries);

export type InsertLedgerEntry = z.infer<typeof insertLedgerEntrySchema>;
export type LedgerEntry = typeof ledgerEntries.$inferSelect;
