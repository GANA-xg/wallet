import {
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ticketQrStatus } from "./enums";
import { tickets } from "./tickets";

export const ticketQrs = pgTable(
  "ticket_qrs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id),
    qrContent: varchar("qr_content", { length: 512 }).notNull().unique(),
    hash: varchar("hash", { length: 128 }).notNull().unique(),
    version: integer("version").notNull().default(1),
    status: ticketQrStatus("status").notNull().default("ACTIVE"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => ({
    ticketIdx: index("idx_ticket_qr_ticket").on(table.ticketId),
    qrContentIdx: index("idx_ticket_qr_content").on(table.qrContent),
    hashIdx: index("idx_ticket_qr_hash").on(table.hash),
    statusIdx: index("idx_ticket_qr_status").on(table.status),
    lookupIdx: index("idx_ticket_qr_lookup").on(table.qrContent, table.status),
  }),
);

export const insertTicketQrSchema = createInsertSchema(ticketQrs, {
  ticketId: z.string().uuid(),
  qrContent: z.string().min(1).max(512),
  hash: z.string().min(1).max(128),
  version: z.number().int().positive().default(1),
  status: z
    .enum(["ACTIVE", "USED", "EXPIRED", "REVOKED"])
    .default("ACTIVE"),
  expiresAt: z.string().datetime().nullable().optional(),
  revokedAt: z.string().datetime().nullable().optional(),
});

export const selectTicketQrSchema = createSelectSchema(ticketQrs);

export type InsertTicketQr = z.infer<typeof insertTicketQrSchema>;
export type TicketQr = typeof ticketQrs.$inferSelect;
