import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantStatus } from "./enums";
import { merchantCategories } from "./merchant_categories";

export const merchants = pgTable(
  "merchants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    legalName: varchar("legal_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 20 }),
    gstin: varchar("gstin", { length: 50 }),
    pan: varchar("pan", { length: 20 }),
    merchantIdentifier: varchar("merchant_identifier", { length: 100 })
      .notNull()
      .unique(),
    status: merchantStatus("status").notNull().default("pending"),
    categoryCode: varchar("category_code", { length: 10 }).references(
      () => merchantCategories.code,
    ),
    logoUrl: text("logo_url"),
    website: varchar("website", { length: 255 }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    identifierIdx: uniqueIndex("idx_merchants_identifier").on(
      table.merchantIdentifier,
    ),
    nameIdx: index("idx_merchants_name").on(table.name),
    categoryIdx: index("idx_merchants_category").on(table.categoryCode),
    statusIdx: index("idx_merchants_status").on(table.status),
    emailIdx: index("idx_merchants_email").on(table.email),
  }),
);

export const insertMerchantSchema = createInsertSchema(merchants, {
  name: z.string().min(1).max(255),
  legalName: z.string().min(1).max(255),
  email: z.string().email().max(255).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  gstin: z.string().max(50).nullable().optional(),
  pan: z.string().max(20).nullable().optional(),
  merchantIdentifier: z.string().min(1).max(100),
  status: z
    .enum(["pending", "active", "suspended", "closed"])
    .default("pending"),
  categoryCode: z.string().max(10).nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  website: z.string().max(255).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectMerchantSchema = createSelectSchema(merchants);

export type InsertMerchant = z.infer<typeof insertMerchantSchema>;
export type Merchant = typeof merchants.$inferSelect;
