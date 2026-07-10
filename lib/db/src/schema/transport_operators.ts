import {
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { transportMode, transportOperatorStatus } from "./enums";

export const transportOperators = pgTable(
  "transport_operators",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),
    supportedModes: varchar("supported_modes", { length: 255 }).notNull(),
    cities: varchar("cities", { length: 500 }),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    status: transportOperatorStatus("status").notNull().default("ACTIVE"),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIdx: index("idx_transport_operators_code").on(table.code),
    statusIdx: index("idx_transport_operators_status").on(table.status),
    nameIdx: index("idx_transport_operators_name").on(table.name),
  }),
);

export const insertTransportOperatorSchema = createInsertSchema(
  transportOperators,
  {
    name: z.string().min(1).max(255),
    code: z.string().min(1).max(50),
    description: z.string().nullable().optional(),
    supportedModes: z.string().min(1).max(255),
    cities: z.string().max(500).nullable().optional(),
    contactEmail: z.string().max(255).nullable().optional(),
    contactPhone: z.string().max(20).nullable().optional(),
    status: z
      .enum(["ACTIVE", "INACTIVE", "SUSPENDED"])
      .default("ACTIVE"),
    metadata: z.string().nullable().optional(),
  },
);

export const selectTransportOperatorSchema = createSelectSchema(
  transportOperators,
);

export type InsertTransportOperator = z.infer<
  typeof insertTransportOperatorSchema
>;
export type TransportOperator = typeof transportOperators.$inferSelect;
