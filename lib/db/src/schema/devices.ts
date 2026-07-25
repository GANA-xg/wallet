import { pgTable, uuid, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const devices = pgTable("devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  deviceFingerprint: varchar("device_fingerprint", { length: 255 }).notNull(),
  pushToken: text("push_token"),
  isTrusted: boolean("is_trusted").notNull().default(false),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("devices_user_id_idx").on(table.userId),
}));

export type Device = typeof devices.$inferSelect;
export type NewDevice = typeof devices.$inferInsert;