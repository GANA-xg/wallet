import { pgTable, bigserial, uuid, varchar, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const eventLog = pgTable("event_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("event_log_user_id_idx").on(table.userId),
  createdAtIdx: index("event_log_created_at_idx").on(table.createdAt),
}));

export type EventLog = typeof eventLog.$inferSelect;
export type NewEventLog = typeof eventLog.$inferInsert;