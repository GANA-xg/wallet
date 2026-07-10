import {
  boolean,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const merchantCategories = pgTable("merchant_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 10 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
});

export const insertMerchantCategorySchema = createInsertSchema(
  merchantCategories,
  {
    code: z.string().min(1).max(10),
    name: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    isSystem: z.boolean().default(false),
  },
);

export const selectMerchantCategorySchema = createSelectSchema(
  merchantCategories,
);

export type InsertMerchantCategory = z.infer<
  typeof insertMerchantCategorySchema
>;
export type MerchantCategory = typeof merchantCategories.$inferSelect;
