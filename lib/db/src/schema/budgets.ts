import { pgTable, uuid, varchar, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const budgets = pgTable("budgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  category: varchar("category", { length: 100 }).notNull(),
  limitPaise: bigint("limit_paise", { mode: "number" }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("budgets_user_id_idx").on(table.userId),
}));

export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;