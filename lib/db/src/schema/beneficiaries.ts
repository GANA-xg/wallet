import { pgTable, uuid, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const beneficiaries = pgTable("beneficiaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  upiId: varchar("upi_id", { length: 50 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  nickname: varchar("nickname", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("beneficiaries_user_id_idx").on(table.userId),
}));

export type Beneficiary = typeof beneficiaries.$inferSelect;
export type NewBeneficiary = typeof beneficiaries.$inferInsert;