import {
  index,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { metroPassType } from "./enums";
import { users } from "./auth";
import { transportOperators } from "./transport_operators";

export const metroPasses = pgTable(
  "metro_passes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => transportOperators.id),
    passType: metroPassType("pass_type").notNull(),
    passIdentifier: varchar("pass_identifier", { length: 100 }).notNull()
      .unique(),
    price: numeric("price", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("INR"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    remainingUses: varchar("remaining_uses", { length: 20 }),
    isAutoRenew: varchar("is_auto_renew", { length: 5 }).default("false"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_metro_passes_user").on(table.userId),
    operatorIdx: index("idx_metro_passes_operator").on(table.operatorId),
    passTypeIdx: index("idx_metro_passes_type").on(table.passType),
    identifierIdx: index("idx_metro_passes_identifier").on(
      table.passIdentifier,
    ),
    validFromIdx: index("idx_metro_passes_from").on(table.validFrom),
    validUntilIdx: index("idx_metro_passes_until").on(table.validUntil),
    expiryIdx: index("idx_metro_passes_expiry").on(
      table.validUntil,
      table.userId,
    ),
  }),
);

export const insertMetroPassSchema = createInsertSchema(metroPasses, {
  userId: z.string().uuid(),
  operatorId: z.string().uuid(),
  passType: z.enum([
    "DAILY",
    "WEEKLY",
    "MONTHLY",
    "QUARTERLY",
    "ANNUAL",
    "FLEX",
  ]),
  passIdentifier: z.string().min(1).max(100),
  price: z.string().nullable().optional(),
  currency: z.string().max(3).default("INR"),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  remainingUses: z.string().max(20).nullable().optional(),
  isAutoRenew: z.string().max(5).default("false"),
});

export const selectMetroPassSchema = createSelectSchema(metroPasses);

export type InsertMetroPass = z.infer<typeof insertMetroPassSchema>;
export type MetroPass = typeof metroPasses.$inferSelect;
