import { pgTable, uuid, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  balancePaise: bigint("balance_paise", { mode: "number" }).notNull().default(0),
  upiLitePaise: bigint("upi_lite_paise", { mode: "number" }).notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("wallets_user_id_idx").on(table.userId),
}));

export type Wallet = typeof wallets.$inferSelect;
export type NewWallet = typeof wallets.$inferInsert;