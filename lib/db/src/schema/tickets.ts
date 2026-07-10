import {
  index,
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
import { ticketType, ticketStatus } from "./enums";
import { users } from "./auth";

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    ticketType: ticketType("ticket_type").notNull(),
    status: ticketStatus("status").notNull().default("CREATED"),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    issuerId: varchar("issuer_id", { length: 255 }),
    issuerName: varchar("issuer_name", { length: 255 }),
    venueName: varchar("venue_name", { length: 255 }),
    venueAddress: text("venue_address"),
    seatNumber: varchar("seat_number", { length: 100 }),
    rowNumber: varchar("row_number", { length: 50 }),
    sectionName: varchar("section_name", { length: 100 }),
    gateInfo: varchar("gate_info", { length: 100 }),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }).notNull(),
    price: numeric("price", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("INR"),
    metadata: jsonb("metadata").default({}),
    isTransferable: varchar("is_transferable", { length: 5 }).default("false"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    userIdx: index("idx_tickets_user").on(table.userId),
    statusIdx: index("idx_tickets_status").on(table.status),
    typeIdx: index("idx_tickets_type").on(table.ticketType),
    validFromIdx: index("idx_tickets_valid_from").on(table.validFrom),
    validUntilIdx: index("idx_tickets_valid_until").on(table.validUntil),
    expiryIdx: index("idx_tickets_expiry").on(table.validUntil, table.status),
    issuerIdx: index("idx_tickets_issuer").on(table.issuerId),
    activeIdx: index("idx_tickets_active").on(
      table.userId,
      table.status,
      table.validUntil,
    ),
  }),
);

export const insertTicketSchema = createInsertSchema(tickets, {
  userId: z.string().uuid(),
  ticketType: z.enum([
    "EVENT",
    "TRANSPORT",
    "MOVIE",
    "FLIGHT",
    "PARKING",
    "CUSTOM",
  ]),
  status: z
    .enum([
      "CREATED",
      "ACTIVE",
      "USED",
      "EXPIRED",
      "CANCELLED",
      "REFUNDED",
    ])
    .default("CREATED"),
  title: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  issuerId: z.string().max(255).nullable().optional(),
  issuerName: z.string().max(255).nullable().optional(),
  venueName: z.string().max(255).nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  seatNumber: z.string().max(100).nullable().optional(),
  rowNumber: z.string().max(50).nullable().optional(),
  sectionName: z.string().max(100).nullable().optional(),
  gateInfo: z.string().max(100).nullable().optional(),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  price: z.string().nullable().optional(),
  currency: z.string().max(3).default("INR"),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  isTransferable: z.string().max(5).default("false"),
});

export const selectTicketSchema = createSelectSchema(tickets);

export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;
