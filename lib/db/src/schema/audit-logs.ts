import { pgTable, bigserial, uuid, varchar, inet, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { devices } from "./devices";

export const auditLogs = pgTable("audit_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  ipAddress: inet("ip_address"),
  deviceId: uuid("device_id").references(() => devices.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;