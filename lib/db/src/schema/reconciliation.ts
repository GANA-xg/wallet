import {
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { reconciliationStatus } from "./enums";
import { transactions } from "./transactions";
import { settlements } from "./settlements";

export const reconciliationBatches = pgTable(
  "reconciliation_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    batchReference: varchar("batch_reference", { length: 100 })
      .notNull()
      .unique(),
    provider: varchar("provider", { length: 50 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    totalItems: integer("total_items").notNull().default(0),
    matchedCount: integer("matched_count").notNull().default(0),
    mismatchedCount: integer("mismatched_count").notNull().default(0),
    pendingCount: integer("pending_count").notNull().default(0),
    disputedCount: integer("disputed_count").notNull().default(0),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    batchRefIdx: uniqueIndex("idx_recon_batches_reference").on(
      table.batchReference,
    ),
    providerIdx: index("idx_recon_batches_provider").on(table.provider),
    statusIdx: index("idx_recon_batches_completed").on(table.completedAt),
  }),
);

export const reconciliationItems = pgTable(
  "reconciliation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reconciliationBatchId: uuid("reconciliation_batch_id")
      .notNull()
      .references(() => reconciliationBatches.id),
    transactionId: uuid("transaction_id").references(() => transactions.id),
    settlementId: uuid("settlement_id").references(() => settlements.id),
    providerReference: varchar("provider_reference", { length: 255 }).notNull(),
    expectedAmount: numeric("expected_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    actualAmount: numeric("actual_amount", { precision: 15, scale: 2 }),
    currencyCode: char("currency_code", { length: 3 })
      .notNull()
      .default("INR"),
    status: reconciliationStatus("status").notNull().default("PENDING"),
    discrepancy: numeric("discrepancy", { precision: 15, scale: 2 }),
    notes: text("notes"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    batchIdx: index("idx_recon_items_batch").on(table.reconciliationBatchId),
    transactionIdx: index("idx_recon_items_transaction").on(
      table.transactionId,
    ),
    settlementIdx: index("idx_recon_items_settlement").on(table.settlementId),
    providerRefIdx: index("idx_recon_items_provider_ref").on(
      table.providerReference,
    ),
    statusIdx: index("idx_recon_items_status").on(table.status),
  }),
);

export const insertReconciliationBatchSchema = createInsertSchema(
  reconciliationBatches,
  {
    batchReference: z.string().min(1).max(100),
    provider: z.string().min(1).max(50),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable().optional(),
    totalItems: z.number().int().min(0).default(0),
    matchedCount: z.number().int().min(0).default(0),
    mismatchedCount: z.number().int().min(0).default(0),
    pendingCount: z.number().int().min(0).default(0),
    disputedCount: z.number().int().min(0).default(0),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  },
);

export const selectReconciliationBatchSchema = createSelectSchema(
  reconciliationBatches,
);

export const insertReconciliationItemSchema = createInsertSchema(
  reconciliationItems,
  {
    reconciliationBatchId: z.string().uuid(),
    transactionId: z.string().uuid().nullable().optional(),
    settlementId: z.string().uuid().nullable().optional(),
    providerReference: z.string().min(1).max(255),
    expectedAmount: z.string().default("0"),
    actualAmount: z.string().nullable().optional(),
    currencyCode: z.string().length(3).default("INR"),
    status: z
      .enum(["MATCHED", "MISMATCHED", "PENDING", "DISPUTED"])
      .default("PENDING"),
    discrepancy: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    resolvedAt: z.string().datetime().nullable().optional(),
  },
);

export const selectReconciliationItemSchema = createSelectSchema(
  reconciliationItems,
);

export type InsertReconciliationBatch = z.infer<
  typeof insertReconciliationBatchSchema
>;
export type ReconciliationBatch = typeof reconciliationBatches.$inferSelect;
export type InsertReconciliationItem = z.infer<
  typeof insertReconciliationItemSchema
>;
export type ReconciliationItem = typeof reconciliationItems.$inferSelect;
