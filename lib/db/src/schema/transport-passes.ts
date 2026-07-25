import { pgTable, uuid, varchar, bigint, timestamp, date, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { transportPassTypeEnum } from "./enums";

export const transportPasses = pgTable("transport_passes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: transportPassTypeEnum("type").notNull(),
  cardNumber: varchar("card_number", { length: 50 }).notNull(),
  balancePaise: bigint("balance_paise", { mode: "number" }).notNull().default(0),
  city: varchar("city", { length: 100 }).notNull(),
  expiresAt: date("expires_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("transport_passes_user_id_idx").on(table.userId),
}));

export type TransportPass = typeof transportPasses.$inferSelect;
export type NewTransportPass = typeof transportPasses.$inferInsert;