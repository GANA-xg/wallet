import {
  char,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { walletStatus } from "./enums";

export const wallets = pgTable(
  "wallets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    status: walletStatus("status").notNull().default("active"),
    currencyCode: char("currency_code", { length: 3 }).notNull().default("INR"),
    cachedBalance: numeric("cached_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    availableBalance: numeric("available_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    reservedBalance: numeric("reserved_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    pendingBalance: numeric("pending_balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    version: integer("version").notNull().default(1),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    entityIdx: uniqueIndex("idx_wallets_entity").on(
      table.entityType,
      table.entityId,
    ),
    statusIdx: index("idx_wallets_status").on(table.status),
  }),
);

export const insertWalletSchema = createInsertSchema(wallets, {
  entityType: z.string().min(1).max(50),
  entityId: z.string().uuid(),
  status: z.enum(["active", "inactive", "frozen", "closed"]).default("active"),
  currencyCode: z.string().length(3).default("INR"),
  cachedBalance: z.string().default("0"),
  availableBalance: z.string().default("0"),
  reservedBalance: z.string().default("0"),
  pendingBalance: z.string().default("0"),
  version: z.number().int().positive().default(1),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectWalletSchema = createSelectSchema(wallets);

export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = typeof wallets.$inferSelect;
