import {
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rewardType } from "./enums";
import { users } from "./auth";

export const rewardBalances = pgTable(
  "reward_balances",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    rewardType: rewardType("reward_type").notNull(),
    balance: numeric("balance", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    lifetimeEarned: numeric("lifetime_earned", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    lifetimeRedeemed: numeric("life_redeemed", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    pointsBalance: integer("points_balance").default(0),
    lifetimePoints: integer("lifetime_points").default(0),
    nextExpiryDate: timestamp("next_expiry_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_reward_balances_user").on(table.userId),
    typeIdx: index("idx_reward_balances_type").on(table.rewardType),
    expiryIdx: index("idx_reward_balances_expiry").on(table.nextExpiryDate),
    userTypeIdx: index("idx_reward_balances_user_type").on(
      table.userId,
      table.rewardType,
    ),
  }),
);

export const insertRewardBalanceSchema = createInsertSchema(rewardBalances, {
  userId: z.string().uuid(),
  rewardType: z.enum(["CASHBACK", "POINTS", "VOUCHER", "PROMOTIONAL"]),
  balance: z.string().default("0"),
  lifetimeEarned: z.string().default("0"),
  lifetimeRedeemed: z.string().default("0"),
  pointsBalance: z.number().int().default(0),
  lifetimePoints: z.number().int().default(0),
  nextExpiryDate: z.string().datetime().nullable().optional(),
});

export const selectRewardBalanceSchema = createSelectSchema(rewardBalances);

export type InsertRewardBalance = z.infer<typeof insertRewardBalanceSchema>;
export type RewardBalance = typeof rewardBalances.$inferSelect;
