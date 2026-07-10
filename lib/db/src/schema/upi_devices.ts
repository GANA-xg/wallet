import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { upiAccounts } from "./upi_accounts";

export const upiDevices = pgTable(
  "upi_devices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    upiAccountId: uuid("upi_account_id")
      .notNull()
      .references(() => upiAccounts.id),
    deviceIdentifier: varchar("device_identifier", { length: 255 }).notNull(),
    deviceName: varchar("device_name", { length: 255 }),
    osType: varchar("os_type", { length: 50 }),
    appVersion: varchar("app_version", { length: 50 }),
    isVerified: boolean("is_verified").notNull().default(false),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    accountIdx: index("idx_upi_devices_account").on(table.upiAccountId),
    deviceIdentifierIdx: index("idx_upi_devices_identifier").on(
      table.deviceIdentifier,
    ),
    verifiedIdx: index("idx_upi_devices_verified").on(table.isVerified),
  }),
);

export const insertUpiDeviceSchema = createInsertSchema(upiDevices, {
  upiAccountId: z.string().uuid(),
  deviceIdentifier: z.string().min(1).max(255),
  deviceName: z.string().max(255).nullable().optional(),
  osType: z.string().max(50).nullable().optional(),
  appVersion: z.string().max(50).nullable().optional(),
  isVerified: z.boolean().default(false),
  verifiedAt: z.string().datetime().nullable().optional(),
});

export const selectUpiDeviceSchema = createSelectSchema(upiDevices);

export type InsertUpiDevice = z.infer<typeof insertUpiDeviceSchema>;
export type UpiDevice = typeof upiDevices.$inferSelect;
