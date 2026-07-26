import { pgTable, uuid, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { kycStatusEnum, themePrefEnum } from "./enums";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  phone: varchar("phone", { length: 15 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  pinHash: varchar("pin_hash", { length: 255 }).notNull(),
  kycStatus: kycStatusEnum("kyc_status").notNull().default("pending"),
  themePref: themePrefEnum("theme_pref").notNull().default("dark"),
  language: varchar("language", { length: 10 }).notNull().default("en-IN"),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
