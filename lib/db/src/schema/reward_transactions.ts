import {
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rewardType, rewardTransactionType } from "./enums";
import { users } from "./auth";

export const rewardTransactions = pgTable(
  "reward_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    rewardType: rewardType("reward_type").notNull(),
    transactionType: rewardTransactionType("transaction_type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }),
    pointsAmount: integer("points_amount"),
    balanceBefore: numeric("balance_before", { precision: 12, scale: 2 }),
    balanceAfter: numeric("balance_after", { precision: 12, scale: 2 }),
    description: text("description"),
    referenceId: varchar("reference_id", { length: 255 }),
    rewardCatalogId: uuid("reward_catalog_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: text("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_reward_tx_user").on(table.userId),
    typeIdx: index("idx_reward_tx_type").on(table.rewardType),
    txTypeIdx: index("idx_reward_tx_tx_type").on(table.transactionType),
    refIdx: index("idx_reward_tx_reference").on(table.referenceId),
    rewardCatalogIdx: index("idx_reward_tx_catalog").on(
      table.rewardCatalogId,
    ),
    expiryIdx: index("idx_reward_tx_expiry").on(table.expiresAt),
    createdAtIdx: index("idx_reward_tx_created").on(table.createdAt),
    userHistoryIdx: index("idx_reward_tx_user_history").on(
      table.userId,
      table.createdAt,
    ),
  }),
);

export const insertRewardTransactionSchema = createInsertSchema(
  rewardTransactions,
  {
    userId: z.string().uuid(),
    rewardType: z.enum(["CASHBACK", "POINTS", "VOUCHER", "PROMOTIONAL"]),
    transactionType: z.enum([
      "EARNED",
      "REDEEMED",
      "EXPIRED",
      "ADJUSTED",
      "REVERSED",
    ]),
    amount: z.string(),
    currency: z.string().max(3).nullable().optional(),
    pointsAmount: z.number().int().nullable().optional(),
    balanceBefore: z.string().nullable().optional(),
    balanceAfter: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    referenceId: z.string().max(255).nullable().optional(),
    rewardCatalogId: z.string().uuid().nullable().optional(),
    expiresAt: z.string().datetime().nullable().optional(),
    metadata: z.string().nullable().optional(),
  },
);

export const selectRewardTransactionSchema = createSelectSchema(
  rewardTransactions,
);

export type InsertRewardTransaction = z.infer<
  typeof insertRewardTransactionSchema
>;
export type RewardTransaction = typeof rewardTransactions.$inferSelect;
