import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./auth";

export const upiAccounts = pgTable(
  "upi_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    phoneNumber: varchar("phone_number", { length: 20 }),
    accountProvider: varchar("account_provider", { length: 100 }).notNull(),
    providerReference: varchar("provider_reference", { length: 255 }),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_upi_accounts_user").on(table.userId),
    providerIdx: index("idx_upi_accounts_provider").on(table.accountProvider),
    statusIdx: index("idx_upi_accounts_status").on(table.status),
  }),
);

export const insertUpiAccountSchema = createInsertSchema(upiAccounts, {
  userId: z.string().uuid(),
  phoneNumber: z.string().max(20).nullable().optional(),
  accountProvider: z.string().min(1).max(100),
  providerReference: z.string().max(255).nullable().optional(),
  status: z.string().max(20).default("active"),
  verifiedAt: z.string().datetime().nullable().optional(),
});

export const selectUpiAccountSchema = createSelectSchema(upiAccounts);

export type InsertUpiAccount = z.infer<typeof insertUpiAccountSchema>;
export type UpiAccount = typeof upiAccounts.$inferSelect;
