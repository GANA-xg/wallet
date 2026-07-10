import {
  boolean,
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchants } from "./merchants";

export const merchantLocations = pgTable(
  "merchant_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    name: varchar("name", { length: 255 }).notNull(),
    addressLine1: varchar("address_line1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 100 }).notNull().default("IN"),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    merchantIdx: index("idx_merchant_locations_merchant").on(table.merchantId),
    cityIdx: index("idx_merchant_locations_city").on(table.city),
    activeIdx: index("idx_merchant_locations_active").on(table.isActive),
  }),
);

export const insertMerchantLocationSchema = createInsertSchema(
  merchantLocations,
  {
    merchantId: z.string().uuid(),
    name: z.string().min(1).max(255),
    addressLine1: z.string().min(1).max(255),
    addressLine2: z.string().max(255).nullable().optional(),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(100),
    postalCode: z.string().min(1).max(20),
    country: z.string().max(100).default("IN"),
    latitude: z.string().nullable().optional(),
    longitude: z.string().nullable().optional(),
    isActive: z.boolean().default(true),
  },
);

export const selectMerchantLocationSchema = createSelectSchema(
  merchantLocations,
);

export type InsertMerchantLocation = z.infer<
  typeof insertMerchantLocationSchema
>;
export type MerchantLocation = typeof merchantLocations.$inferSelect;
