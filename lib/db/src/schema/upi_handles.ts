import {
  boolean,
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { upiHandleStatus } from "./enums";
import { upiAccounts } from "./upi_accounts";

export const upiHandles = pgTable(
  "upi_handles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    upiAccountId: uuid("upi_account_id")
      .notNull()
      .references(() => upiAccounts.id),
    handle: varchar("handle", { length: 255 }).notNull().unique(),
    isPrimary: boolean("is_primary").notNull().default(false),
    status: upiHandleStatus("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    handleIdx: uniqueIndex("idx_upi_handles_value").on(table.handle),
    accountIdx: index("idx_upi_handles_account").on(table.upiAccountId),
    primaryIdx: index("idx_upi_handles_primary").on(
      table.upiAccountId,
      table.isPrimary,
    ),
    statusIdx: index("idx_upi_handles_status").on(table.status),
  }),
);

export const insertUpiHandleSchema = createInsertSchema(upiHandles, {
  upiAccountId: z.string().uuid(),
  handle: z.string().min(1).max(255),
  isPrimary: z.boolean().default(false),
  status: z
    .enum(["active", "inactive", "suspended", "released"])
    .default("active"),
});

export const selectUpiHandleSchema = createSelectSchema(upiHandles);

export type InsertUpiHandle = z.infer<typeof insertUpiHandleSchema>;
export type UpiHandle = typeof upiHandles.$inferSelect;
