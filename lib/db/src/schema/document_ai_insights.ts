import {
  index,
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
import { documentVersions } from "./document_versions";

export const documentAiInsights = pgTable(
  "document_ai_insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentVersionId: uuid("document_version_id")
      .notNull()
      .references(() => documentVersions.id),
    classification: varchar("classification", { length: 100 }),
    classificationConfidence: numeric("classification_confidence", {
      precision: 5,
      scale: 2,
    }),
    summary: text("summary"),
    fraudRiskScore: numeric("fraud_risk_score", { precision: 5, scale: 2 }),
    fraudIndicators: jsonb("fraud_indicators"),
    verificationSuggestions: jsonb("verification_suggestions"),
    aiProvider: varchar("ai_provider", { length: 100 }),
    aiModelVersion: varchar("ai_model_version", { length: 50 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    versionIdx: index("idx_doc_ai_version").on(table.documentVersionId),
    classificationIdx: index("idx_doc_ai_classification").on(
      table.classification,
    ),
    fraudScoreIdx: index("idx_doc_ai_fraud_score").on(table.fraudRiskScore),
    createdAtIdx: index("idx_doc_ai_created").on(table.createdAt),
  }),
);

export const insertDocumentAiInsightSchema = createInsertSchema(
  documentAiInsights,
  {
    documentVersionId: z.string().uuid(),
    classification: z.string().max(100).nullable().optional(),
    classificationConfidence: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    fraudRiskScore: z.string().nullable().optional(),
    fraudIndicators: z
      .array(z.record(z.string(), z.unknown()))
      .nullable()
      .optional(),
    verificationSuggestions: z
      .array(z.record(z.string(), z.unknown()))
      .nullable()
      .optional(),
    aiProvider: z.string().max(100).nullable().optional(),
    aiModelVersion: z.string().max(50).nullable().optional(),
  },
);

export const selectDocumentAiInsightSchema = createSelectSchema(
  documentAiInsights,
);

export type InsertDocumentAiInsight = z.infer<
  typeof insertDocumentAiInsightSchema
>;
export type DocumentAiInsight = typeof documentAiInsights.$inferSelect;
