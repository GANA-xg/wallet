import {
  boolean,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cardStatus } from "./enums";
import { wallets } from "./wallets";
import { cardArtwork } from "./card_artwork";

export const virtualCards = pgTable(
  "virtual_cards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.id),
    cardNetwork: varchar("card_network", { length: 20 }).notNull(),
    issuer: varchar("issuer", { length: 255 }),
    lastFour: varchar("last_four", { length: 4 }).notNull(),
    expiryMonth: integer("expiry_month").notNull(),
    expiryYear: integer("expiry_year").notNull(),
    tokenReference: varchar("token_reference", { length: 255 }).unique(),
    nickname: varchar("nickname", { length: 255 }),
    artworkId: uuid("artwork_id").references(() => cardArtwork.id),
    status: cardStatus("status").notNull().default("active"),
    isNetworkTokenized: boolean("is_network_tokenized").notNull().default(true),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    replacedByCardId: uuid("replaced_by_card_id"),
    replacedAt: timestamp("replaced_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    walletIdx: index("idx_virtual_cards_wallet").on(table.walletId),
    statusIdx: index("idx_virtual_cards_status").on(table.status),
    expiryIdx: index("idx_virtual_cards_expiry").on(
      table.expiryYear,
      table.expiryMonth,
    ),
  }),
);

export const insertVirtualCardSchema = createInsertSchema(virtualCards, {
  walletId: z.string().uuid(),
  cardNetwork: z.string().min(1).max(20),
  issuer: z.string().max(255).nullable().optional(),
  lastFour: z.string().length(4),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2020).max(2099),
  tokenReference: z.string().max(255).nullable().optional(),
  nickname: z.string().max(255).nullable().optional(),
  artworkId: z.string().uuid().nullable().optional(),
  status: z
    .enum(["active", "frozen", "suspended", "cancelled", "expired"])
    .default("active"),
  isNetworkTokenized: z.boolean().default(true),
  frozenAt: z.string().datetime().nullable().optional(),
  replacedByCardId: z.string().uuid().nullable().optional(),
  replacedAt: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  cancelledAt: z.string().datetime().nullable().optional(),
});

export const selectVirtualCardSchema = createSelectSchema(virtualCards);

export type InsertVirtualCard = z.infer<typeof insertVirtualCardSchema>;
export type VirtualCard = typeof virtualCards.$inferSelect;
