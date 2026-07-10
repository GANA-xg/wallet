import {
  boolean,
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
import { beneficiaryType, beneficiaryVerificationStatus } from "./enums";
import { users } from "./auth";

export const beneficiaries = pgTable(
  "beneficiaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    beneficiaryType: beneficiaryType("beneficiary_type").notNull(),
    referenceId: uuid("reference_id").notNull(),
    nickname: varchar("nickname", { length: 255 }),
    isFavorite: boolean("is_favorite").notNull().default(false),
    transferLimitPerTxn: numeric("transfer_limit_per_txn", {
      precision: 15,
      scale: 2,
    }),
    transferLimitDaily: numeric("transfer_limit_daily", {
      precision: 15,
      scale: 2,
    }),
    verificationStatus: beneficiaryVerificationStatus("verification_status")
      .notNull()
      .default("pending"),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    usageCount: integer("usage_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_beneficiaries_user").on(table.userId),
    typeIdx: index("idx_beneficiaries_type").on(table.beneficiaryType),
    favoriteIdx: index("idx_beneficiaries_favorite").on(
      table.userId,
      table.isFavorite,
    ),
    referenceIdx: index("idx_beneficiaries_reference").on(
      table.beneficiaryType,
      table.referenceId,
    ),
    verificationIdx: index("idx_beneficiaries_verification").on(
      table.verificationStatus,
    ),
    usageIdx: index("idx_beneficiaries_last_used").on(table.lastUsedAt),
  }),
);

export const insertBeneficiarySchema = createInsertSchema(beneficiaries, {
  userId: z.string().uuid(),
  beneficiaryType: z.enum(["UPI", "WALLET", "BANK"]),
  referenceId: z.string().uuid(),
  nickname: z.string().max(255).nullable().optional(),
  isFavorite: z.boolean().default(false),
  transferLimitPerTxn: z.string().nullable().optional(),
  transferLimitDaily: z.string().nullable().optional(),
  verificationStatus: z
    .enum(["pending", "verified", "failed"])
    .default("pending"),
  verifiedAt: z.string().datetime().nullable().optional(),
  lastUsedAt: z.string().datetime().nullable().optional(),
  usageCount: z.number().int().min(0).default(0),
});

export const selectBeneficiarySchema = createSelectSchema(beneficiaries);

export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiaries.$inferSelect;
