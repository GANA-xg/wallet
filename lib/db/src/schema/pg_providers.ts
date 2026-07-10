import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pgProviderCode } from "./enums";

export const pgProviders = pgTable(
  "pg_providers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    code: pgProviderCode("code").notNull().unique(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    supportedCurrencies: varchar("supported_currencies", { length: 255 }),
    supportedMethods: varchar("supported_methods", { length: 500 }),
    baseUrl: varchar("base_url", { length: 500 }),
    webhookSecret: varchar("webhook_secret", { length: 500 }),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIdx: index("idx_pg_providers_code").on(table.code),
    activeIdx: index("idx_pg_providers_active").on(table.isActive),
  }),
);

export const insertPgProviderSchema = createInsertSchema(pgProviders, {
  name: z.string().min(1).max(100),
  code: z.enum(["RAZORPAY", "GPAY", "PHONEPE"]),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  supportedCurrencies: z.string().max(255).nullable().optional(),
  supportedMethods: z.string().max(500).nullable().optional(),
  baseUrl: z.string().max(500).nullable().optional(),
  webhookSecret: z.string().max(500).nullable().optional(),
  metadata: z.string().nullable().optional(),
});

export const selectPgProviderSchema = createSelectSchema(pgProviders);

export type InsertPgProvider = z.infer<typeof insertPgProviderSchema>;
export type PgProvider = typeof pgProviders.$inferSelect;
