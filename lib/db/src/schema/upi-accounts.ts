import { pgTable, uuid, varchar, timestamp, boolean, index, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

export const upiAccounts = pgTable("upi_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  upiId: varchar("upi_id", { length: 50 }).notNull(),
  bankName: varchar("bank_name", { length: 255 }),
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("upi_accounts_user_id_idx").on(table.userId),
  userUpiIdUnique: unique("upi_accounts_user_upi_id_unique").on(table.userId, table.upiId),
}));

export type UpiAccount = typeof upiAccounts.$inferSelect;
export type NewUpiAccount = typeof upiAccounts.$inferInsert;