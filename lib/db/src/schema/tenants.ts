import { pgTable, text, uuid, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  domain: varchar("domain", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  plan: varchar("plan", { length: 50 }).notNull().default("starter"),
  settings: jsonb("settings").default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants, {
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100),
  domain: z.string().max(255).nullable().optional(),
  status: z.enum(["active", "suspended", "trial"]).default("active"),
  plan: z.string().max(50).default("starter"),
  settings: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectTenantSchema = createSelectSchema(tenants);

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;
