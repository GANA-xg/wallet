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
import { metroCardStatus } from "./enums";
import { users } from "./auth";
import { transportOperators } from "./transport_operators";

export const metroCards = pgTable(
  "metro_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => transportOperators.id),
    cardNumber: varchar("card_number", { length: 50 }).notNull().unique(),
    cardLabel: varchar("card_label", { length: 255 }),
    status: metroCardStatus("status").notNull().default("ACTIVE"),
    balance: numeric("balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    currency: varchar("currency", { length: 3 }).default("INR"),
    nfcIdentifier: varchar("nfc_identifier", { length: 128 }),
    nfcMetadata: varchar("nfc_metadata", { length: 1024 }),
    qrIdentifier: varchar("qr_identifier", { length: 128 }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_metro_cards_user").on(table.userId),
    operatorIdx: index("idx_metro_cards_operator").on(table.operatorId),
    cardNumberIdx: index("idx_metro_cards_number").on(table.cardNumber),
    statusIdx: index("idx_metro_cards_status").on(table.status),
    nfcIdx: index("idx_metro_cards_nfc").on(table.nfcIdentifier),
    qrIdx: index("idx_metro_cards_qr").on(table.qrIdentifier),
    lookupIdx: index("idx_metro_cards_lookup").on(
      table.userId,
      table.status,
    ),
  }),
);

export const insertMetroCardSchema = createInsertSchema(metroCards, {
  userId: z.string().uuid(),
  operatorId: z.string().uuid(),
  cardNumber: z.string().min(1).max(50),
  cardLabel: z.string().max(255).nullable().optional(),
  status: z
    .enum(["ACTIVE", "INACTIVE", "LOST", "STOLEN", "EXPIRED", "BLOCKED"])
    .default("ACTIVE"),
  balance: z.string().default("0"),
  currency: z.string().max(3).default("INR"),
  nfcIdentifier: z.string().max(128).nullable().optional(),
  nfcMetadata: z.string().max(1024).nullable().optional(),
  qrIdentifier: z.string().max(128).nullable().optional(),
  lastUsedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const selectMetroCardSchema = createSelectSchema(metroCards);

export type InsertMetroCard = z.infer<typeof insertMetroCardSchema>;
export type MetroCard = typeof metroCards.$inferSelect;
