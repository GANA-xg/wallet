import { pgTable, uuid, varchar, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { transactions } from "./transactions";
import { subscriptionCadenceEnum, subscriptionStatusEnum } from "./enums";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  merchant: varchar("merchant", { length: 255 }).notNull(),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
  cadence: subscriptionCadenceEnum("cadence").notNull(),
  detectedFromTxnId: uuid("detected_from_txn_id").references(() => transactions.id),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;