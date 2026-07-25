import { pgTable, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { rewardTypeEnum } from "./enums";

export const rewards = pgTable("rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: rewardTypeEnum("type").notNull(),
  brand: varchar("brand", { length: 255 }).notNull(),
  value: jsonb("value").notNull(),
  code: varchar("code", { length: 50 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("rewards_user_id_idx").on(table.userId),
}));

export type Reward = typeof rewards.$inferSelect;
export type NewReward = typeof rewards.$inferInsert;