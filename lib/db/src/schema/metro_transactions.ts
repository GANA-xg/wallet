import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { metroTransactionType, metroTransactionStatus } from "./enums";
import { users } from "./auth";
import { transportOperators } from "./transport_operators";
import { metroCards } from "./metro_cards";
import { metroPasses } from "./metro_passes";

export const metroTransactions = pgTable(
  "metro_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => transportOperators.id),
    metroCardId: uuid("metro_card_id").references(() => metroCards.id),
    metroPassId: uuid("metro_pass_id").references(() => metroPasses.id),
    transactionType: metroTransactionType("transaction_type").notNull(),
    status: metroTransactionStatus("status").notNull().default("COMPLETED"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("INR"),
    description: text("description"),
    referenceId: varchar("reference_id", { length: 255 }),
    externalRefId: varchar("external_ref_id", { length: 255 }),
    deviceId: varchar("device_id", { length: 255 }),
    stationEntry: varchar("station_entry", { length: 255 }),
    stationExit: varchar("station_exit", { length: 255 }),
    routeInfo: varchar("route_info", { length: 500 }),
    tapInTime: timestamp("tap_in_time", { withTimezone: true }),
    tapOutTime: timestamp("tap_out_time", { withTimezone: true }),
    offlineId: varchar("offline_id", { length: 128 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_metro_tx_user").on(table.userId),
    operatorIdx: index("idx_metro_tx_operator").on(table.operatorId),
    cardIdx: index("idx_metro_tx_card").on(table.metroCardId),
    passIdx: index("idx_metro_tx_pass").on(table.metroPassId),
    typeIdx: index("idx_metro_tx_type").on(table.transactionType),
    statusIdx: index("idx_metro_tx_status").on(table.status),
    refIdx: index("idx_metro_tx_reference").on(table.referenceId),
    externalRefIdx: index("idx_metro_tx_external_ref").on(
      table.externalRefId,
    ),
    offlineIdx: index("idx_metro_tx_offline").on(table.offlineId),
    tapInIdx: index("idx_metro_tx_tap_in").on(table.tapInTime),
    createdAtIdx: index("idx_metro_tx_created").on(table.createdAt),
    userHistoryIdx: index("idx_metro_tx_user_history").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const insertMetroTransactionSchema = createInsertSchema(
  metroTransactions,
  {
    userId: z.string().uuid(),
    operatorId: z.string().uuid(),
    metroCardId: z.string().uuid().nullable().optional(),
    metroPassId: z.string().uuid().nullable().optional(),
    transactionType: z.enum(["RIDE", "TOPUP", "REFUND", "ADJUSTMENT"]),
    status: z
      .enum(["PENDING", "COMPLETED", "FAILED", "REVERSED"])
      .default("COMPLETED"),
    amount: z.string(),
    currency: z.string().max(3).default("INR"),
    description: z.string().nullable().optional(),
    referenceId: z.string().max(255).nullable().optional(),
    externalRefId: z.string().max(255).nullable().optional(),
    deviceId: z.string().max(255).nullable().optional(),
    stationEntry: z.string().max(255).nullable().optional(),
    stationExit: z.string().max(255).nullable().optional(),
    routeInfo: z.string().max(500).nullable().optional(),
    tapInTime: z.string().datetime().nullable().optional(),
    tapOutTime: z.string().datetime().nullable().optional(),
    offlineId: z.string().max(128).nullable().optional(),
  },
);

export const selectMetroTransactionSchema = createSelectSchema(
  metroTransactions,
);

export type InsertMetroTransaction = z.infer<
  typeof insertMetroTransactionSchema
>;
export type MetroTransaction = typeof metroTransactions.$inferSelect;
