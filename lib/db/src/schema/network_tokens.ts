import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tokenStatus } from "./enums";

export const networkTokens = pgTable(
  "network_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenReference: varchar("token_reference", { length: 255 })
      .notNull()
      .unique(),
    cardType: varchar("card_type", { length: 20 }).notNull(),
    cardId: uuid("card_id").notNull(),
    tokenExpiresAt: timestamp("token_expires_at", {
      withTimezone: true,
    }).notNull(),
    status: tokenStatus("status").notNull().default("active"),
    rotatedFromTokenId: uuid("rotated_from_token_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    tokenRefIdx: uniqueIndex("idx_network_tokens_reference").on(
      table.tokenReference,
    ),
    cardIdx: index("idx_network_tokens_card").on(table.cardType, table.cardId),
    statusIdx: index("idx_network_tokens_status").on(table.status),
    rotationIdx: index("idx_network_tokens_rotation").on(
      table.rotatedFromTokenId,
    ),
  }),
);

export const insertNetworkTokenSchema = createInsertSchema(networkTokens, {
  tokenReference: z.string().min(1).max(255),
  cardType: z.string().min(1).max(20),
  cardId: z.string().uuid(),
  tokenExpiresAt: z.string().datetime(),
  status: z
    .enum(["active", "suspended", "expired", "rotated"])
    .default("active"),
  rotatedFromTokenId: z.string().uuid().nullable().optional(),
});

export const selectNetworkTokenSchema = createSelectSchema(networkTokens);

export type InsertNetworkToken = z.infer<typeof insertNetworkTokenSchema>;
export type NetworkToken = typeof networkTokens.$inferSelect;
