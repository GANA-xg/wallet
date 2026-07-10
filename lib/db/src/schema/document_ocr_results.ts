import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ocrStatus } from "./enums";
import { documentVersions } from "./document_versions";

export const documentOcrResults = pgTable(
  "document_ocr_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    extractedText: text("extracted_text"),
    extractedFields: jsonb("extracted_fields"),
    confidence: numeric("confidence", { precision: 5, scale: 2 }),
    ocrProvider: varchar("ocr_provider", { length: 100 }),
    ocrModelVersion: varchar("ocr_model_version", { length: 50 }),
    processingTimeMs: integer("processing_time_ms"),
    ocrStatus: ocrStatus("ocr_status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    versionIdx: index("idx_doc_ocr_version").on(table.documentVersionId),
    statusIdx: index("idx_doc_ocr_status").on(table.ocrStatus),
    createdAtIdx: index("idx_doc_ocr_created").on(table.createdAt),
  }),
);

export const insertDocumentOcrResultSchema = createInsertSchema(
  documentOcrResults,
  {
    documentVersionId: z.string().uuid(),
    extractedText: z.string().nullable().optional(),
    extractedFields: z.record(z.string(), z.unknown()).nullable().optional(),
    confidence: z.string().nullable().optional(),
    ocrProvider: z.string().max(100).nullable().optional(),
    ocrModelVersion: z.string().max(50).nullable().optional(),
    processingTimeMs: z.number().int().min(0).nullable().optional(),
    ocrStatus: z
      .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
      .default("PENDING"),
  },
);

export const selectDocumentOcrResultSchema = createSelectSchema(
  documentOcrResults,
);

export type InsertDocumentOcrResult = z.infer<
  typeof insertDocumentOcrResultSchema
>;
export type DocumentOcrResult = typeof documentOcrResults.$inferSelect;
