import { pgTable, uuid, varchar, bigint, timestamp, date, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { recurringIntervalEnum } from "./enums";

export const reservedAmounts = pgTable("reserved_amounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  label: varchar("label", { length: 255 }).notNull(),
  amountPaise: bigint("amount_paise", { mode: "number" }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  dueDate: date("due_date").notNull(),
  isRecurring: boolean("is_recurring").notNull().default(false),
  interval: recurringIntervalEnum("interval"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("reserved_amounts_user_id_idx").on(table.userId),
}));

export type ReservedAmount = typeof reservedAmounts.$inferSelect;
export type NewReservedAmount = typeof reservedAmounts.$inferInsert;