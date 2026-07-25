import { pgTable, uuid, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { transactionTypeEnum, transactionStatusEnum, transactionSourceEnum } from "./enums";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
  type: transactionTypeEnum("type").notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  category: varchar("category", { length: 100 }).notNull(),
  merchant: varchar("merchant", { length: 255 }),
  counterpartyUpi: varchar("counterparty_upi", { length: 50 }),
  source: transactionSourceEnum("source"),
  idempotencyKey: varchar("idempotency_key", { length: 100 }).unique(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  categoryIdx: index("transactions_category_idx").on(table.category),
  occurredAtIdx: index("transactions_occurred_at_idx").on(table.occurredAt),
  categoryOccurredAtIdx: index("transactions_category_occurred_at_idx").on(table.category, table.occurredAt),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;