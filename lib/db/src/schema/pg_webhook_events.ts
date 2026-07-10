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
import { pgWebhookEventStatus } from "./enums";
import { pgProviders } from "./pg_providers";

export const pgWebhookEvents = pgTable(
  "pg_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pgProviderId: uuid("pg_provider_id")
      .notNull()
      .references(() => pgProviders.id),
    eventId: varchar("event_id", { length: 255 }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    status: pgWebhookEventStatus("status").notNull().default("PENDING"),
    headers: jsonb("headers"),
    rawBody: text("raw_body"),
    parsedBody: jsonb("parsed_body"),
    signature: varchar("signature", { length: 500 }),
    signatureValid: varchar("signature_valid", { length: 5 }),
    processingError: text("processing_error"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index("idx_pg_webhook_provider").on(table.pgProviderId),
    eventIdIdx: index("idx_pg_webhook_event_id").on(table.eventId),
    eventTypeIdx: index("idx_pg_webhook_type").on(table.eventType),
    statusIdx: index("idx_pg_webhook_status").on(table.status),
    idempotencyIdx: index("idx_pg_webhook_idempotency").on(
      table.pgProviderId,
      table.eventId,
    ),
  }),
);

export const insertPgWebhookEventSchema = createInsertSchema(
  pgWebhookEvents,
  {
    pgProviderId: z.string().uuid(),
    eventId: z.string().max(255).nullable().optional(),
    eventType: z.string().min(1).max(100),
    status: z
      .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED"])
      .default("PENDING"),
    headers: z.record(z.string(), z.unknown()).nullable().optional(),
    rawBody: z.string().nullable().optional(),
    parsedBody: z.record(z.string(), z.unknown()).nullable().optional(),
    signature: z.string().max(500).nullable().optional(),
    signatureValid: z.string().max(5).nullable().optional(),
    processingError: z.string().nullable().optional(),
    processedAt: z.string().datetime().nullable().optional(),
  },
);

export const selectPgWebhookEventSchema = createSelectSchema(
  pgWebhookEvents,
);

export type InsertPgWebhookEvent = z.infer<
  typeof insertPgWebhookEventSchema
>;
export type PgWebhookEvent = typeof pgWebhookEvents.$inferSelect;
