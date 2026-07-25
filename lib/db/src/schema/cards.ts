import { pgTable, uuid, varchar, text, smallint, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { cardNetworkEnum } from "./enums";

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  encryptedNumber: text("encrypted_number").notNull(),
  last4: varchar("last_four", { length: 4 }).notNull(),
  holderName: varchar("holder_name", { length: 255 }).notNull(),
  expiryMonth: smallint("expiry_month").notNull(),
  expiryYear: smallint("expiry_year").notNull(),
  network: cardNetworkEnum("network").notNull(),
  bankName: varchar("bank_name", { length: 255 }),
  gradientColors: jsonb("gradient_colors"),
  isFrozen: boolean("is_frozen").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("cards_user_id_idx").on(table.userId),
}));

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;