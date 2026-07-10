import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountTypes = pgTable(
  "account_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    category: varchar("category", { length: 50 }).notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);

export const insertAccountTypeSchema = createInsertSchema(accountTypes, {
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  category: z.string().min(1).max(50),
  isSystem: z.boolean().default(false),
});

export const selectAccountTypeSchema = createSelectSchema(accountTypes);

export type InsertAccountType = z.infer<typeof insertAccountTypeSchema>;
export type AccountType = typeof accountTypes.$inferSelect;
