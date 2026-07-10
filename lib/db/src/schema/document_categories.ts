import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const documentCategories = pgTable("document_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isSystem: boolean("is_system").notNull().default(false),
  validationRules: jsonb("validation_rules").default({}),
  retentionDays: integer("retention_days"),
  isIdentity: boolean("is_identity").notNull().default(false),
});

export const insertDocumentCategorySchema = createInsertSchema(
  documentCategories,
  {
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
    isSystem: z.boolean().default(false),
    validationRules: z.record(z.string(), z.unknown()).nullable().optional(),
    retentionDays: z.number().int().min(1).nullable().optional(),
    isIdentity: z.boolean().default(false),
  },
);

export const selectDocumentCategorySchema = createSelectSchema(
  documentCategories,
);

export type InsertDocumentCategory = z.infer<
  typeof insertDocumentCategorySchema
>;
export type DocumentCategory = typeof documentCategories.$inferSelect;
