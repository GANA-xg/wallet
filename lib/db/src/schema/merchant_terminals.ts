import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { merchantTerminalType, merchantTerminalStatus } from "./enums";
import { merchants } from "./merchants";
import { merchantLocations } from "./merchant_locations";

export const merchantTerminals = pgTable(
  "merchant_terminals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    merchantId: uuid("merchant_id")
      .notNull()
      .references(() => merchants.id),
    merchantLocationId: uuid("merchant_location_id").references(
      () => merchantLocations.id,
    ),
    terminalIdentifier: varchar("terminal_identifier", { length: 100 })
      .notNull()
      .unique(),
    terminalType: merchantTerminalType("terminal_type").notNull(),
    serialNumber: varchar("serial_number", { length: 100 }),
    status: merchantTerminalStatus("status").notNull().default("active"),
    isQr: boolean("is_qr").notNull().default(false),
    qrCodeData: text("qr_code_data"),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    terminalIdx: uniqueIndex("idx_merchant_terminals_identifier").on(
      table.terminalIdentifier,
    ),
    merchantIdx: index("idx_merchant_terminals_merchant").on(table.merchantId),
    locationIdx: index("idx_merchant_terminals_location").on(
      table.merchantLocationId,
    ),
    typeIdx: index("idx_merchant_terminals_type").on(table.terminalType),
    statusIdx: index("idx_merchant_terminals_status").on(table.status),
    qrIdx: index("idx_merchant_terminals_qr").on(table.isQr),
  }),
);

export const insertMerchantTerminalSchema = createInsertSchema(
  merchantTerminals,
  {
    merchantId: z.string().uuid(),
    merchantLocationId: z.string().uuid().nullable().optional(),
    terminalIdentifier: z.string().min(1).max(100),
    terminalType: z.enum(["POS", "QR", "NFC", "ECOM"]),
    serialNumber: z.string().max(100).nullable().optional(),
    status: z
      .enum(["active", "inactive", "suspended", "decommissioned"])
      .default("active"),
    isQr: z.boolean().default(false),
    qrCodeData: z.string().nullable().optional(),
    lastHeartbeatAt: z.string().datetime().nullable().optional(),
  },
);

export const selectMerchantTerminalSchema = createSelectSchema(
  merchantTerminals,
);

export type InsertMerchantTerminal = z.infer<
  typeof insertMerchantTerminalSchema
>;
export type MerchantTerminal = typeof merchantTerminals.$inferSelect;
