import {
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rewardType, rewardStatus } from "./enums";

export const rewardCatalog = pgTable(
  "reward_catalog",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    rewardType: rewardType("reward_type").notNull(),
    status: rewardStatus("status").notNull().default("ACTIVE"),
    value: numeric("value", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }),
    pointsCost: integer("points_cost"),
    quantity: integer("quantity").default(0),
    maxRedemptionsPerUser: integer("max_redemptions_per_user"),
    imageUrl: varchar("image_url", { length: 500 }),
    termsConditions: text("terms_conditions"),
    validFrom: timestamp("valid_from", { withTimezone: true }),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    codeIdx: index("idx_reward_catalog_code").on(table.code),
    typeIdx: index("idx_reward_catalog_type").on(table.rewardType),
    statusIdx: index("idx_reward_catalog_status").on(table.status),
    validFromIdx: index("idx_reward_catalog_from").on(table.validFrom),
    validUntilIdx: index("idx_reward_catalog_until").on(table.validUntil),
  }),
);

export const insertRewardCatalogSchema = createInsertSchema(rewardCatalog, {
  code: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  rewardType: z.enum(["CASHBACK", "POINTS", "VOUCHER", "PROMOTIONAL"]),
  status: z
    .enum(["ACTIVE", "EXPIRED", "DISABLED", "ARCHIVED"])
    .default("ACTIVE"),
  value: z.string().nullable().optional(),
  currency: z.string().max(3).nullable().optional(),
  pointsCost: z.number().int().nullable().optional(),
  quantity: z.number().int().default(0),
  maxRedemptionsPerUser: z.number().int().nullable().optional(),
  imageUrl: z.string().max(500).nullable().optional(),
  termsConditions: z.string().nullable().optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdBy: z.string().max(255).nullable().optional(),
});

export const selectRewardCatalogSchema = createSelectSchema(rewardCatalog);

export type InsertRewardCatalog = z.infer<typeof insertRewardCatalogSchema>;
export type RewardCatalog = typeof rewardCatalog.$inferSelect;
