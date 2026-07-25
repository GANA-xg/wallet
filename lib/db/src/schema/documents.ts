import { pgTable, uuid, varchar, text, timestamp, date, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { documentTypeEnum } from "./enums";

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: documentTypeEnum("type").notNull(),
  encryptedNumber: text("encrypted_number").notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  expiryDate: date("expiry_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("documents_user_id_idx").on(table.userId),
}));

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;