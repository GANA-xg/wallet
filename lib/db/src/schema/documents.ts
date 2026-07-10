import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentStatus } from "./enums";
import { users } from "./auth";
import { documentCategories } from "./document_categories";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => documentCategories.id),
    status: documentStatus("status").notNull().default("UPLOADED"),
    description: text("description"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("idx_documents_user").on(table.userId),
    categoryIdx: index("idx_documents_category").on(table.categoryId),
    statusIdx: index("idx_documents_status").on(table.status),
    expiryIdx: index("idx_documents_expiry").on(table.expiresAt),
    uploadIdx: index("idx_documents_upload").on(table.createdAt),
    userStatusIdx: index("idx_documents_user_status").on(
      table.userId,
      table.status,
    ),
  }),
);

export const insertDocumentSchema = createInsertSchema(documents, {
  userId: z.string().uuid(),
  categoryId: z.string().uuid(),
  status: z
    .enum([
      "UPLOADED",
      "PROCESSING",
      "OCR_COMPLETED",
      "UNDER_REVIEW",
      "VERIFIED",
      "REJECTED",
      "EXPIRED",
      "ARCHIVED",
    ])
    .default("UPLOADED"),
  description: z.string().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  verifiedAt: z.string().datetime().nullable().optional(),
  archivedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectDocumentSchema = createSelectSchema(documents);

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;
