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
import { documentVerificationAction } from "./enums";
import { documents } from "./documents";
import { users } from "./auth";

export const documentVerificationHistory = pgTable(
  "document_verification_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    action: documentVerificationAction("action").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    documentIdx: index("idx_doc_verification_document").on(table.documentId),
    userIdx: index("idx_doc_verification_user").on(table.userId),
    actionIdx: index("idx_doc_verification_action").on(table.action),
    createdAtIdx: index("idx_doc_verification_created").on(table.createdAt),
  }),
);

export const insertDocumentVerificationHistorySchema = createInsertSchema(
  documentVerificationHistory,
  {
    documentId: z.string().uuid(),
    userId: z.string().uuid(),
    action: z.enum([
      "VERIFIED",
      "REJECTED",
      "REQUESTED_REUPLOAD",
      "FLAGGED_FOR_REVIEW",
    ]),
    reason: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  },
);

export const selectDocumentVerificationHistorySchema = createSelectSchema(
  documentVerificationHistory,
);

export type InsertDocumentVerificationHistory = z.infer<
  typeof insertDocumentVerificationHistorySchema
>;
export type DocumentVerificationHistory =
  typeof documentVerificationHistory.$inferSelect;
