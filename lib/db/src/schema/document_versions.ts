import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documents } from "./documents";

export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    versionNumber: integer("version_number").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    documentIdx: index("idx_doc_versions_document").on(table.documentId),
    versionIdx: index("idx_doc_versions_number").on(
      table.documentId,
      table.versionNumber,
    ),
  }),
);

export const insertDocumentVersionSchema = createInsertSchema(
  documentVersions,
  {
    documentId: z.string().uuid(),
    versionNumber: z.number().int().positive(),
    notes: z.string().nullable().optional(),
  },
);

export const selectDocumentVersionSchema = createSelectSchema(
  documentVersions,
);

export type InsertDocumentVersion = z.infer<
  typeof insertDocumentVersionSchema
>;
export type DocumentVersion = typeof documentVersions.$inferSelect;
