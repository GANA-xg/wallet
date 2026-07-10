import {
  boolean,
  index,
  pgTable,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { documentVersions } from "./document_versions";
import { files } from "./files";

export const documentFiles = pgTable(
  "document_files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    fileId: uuid("file_id")
      .notNull()
      .references(() => files.id),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => ({
    versionIdx: index("idx_doc_files_version").on(table.documentVersionId),
    fileIdx: index("idx_doc_files_file").on(table.fileId),
    primaryIdx: index("idx_doc_files_primary").on(
      table.documentVersionId,
      table.isPrimary,
    ),
  }),
);

export const insertDocumentFileSchema = createInsertSchema(documentFiles, {
  documentVersionId: z.string().uuid(),
  fileId: z.string().uuid(),
  isPrimary: z.boolean().default(false),
});

export const selectDocumentFileSchema = createSelectSchema(documentFiles);

export type InsertDocumentFile = z.infer<typeof insertDocumentFileSchema>;
export type DocumentFile = typeof documentFiles.$inferSelect;
