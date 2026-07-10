import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ticketEventType } from "./enums";
import { tickets } from "./tickets";

export const ticketEvents = pgTable(
  "ticket_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id),
    eventType: ticketEventType("event_type").notNull(),
    description: text("description"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ticketIdx: index("idx_ticket_events_ticket").on(table.ticketId),
    eventTypeIdx: index("idx_ticket_events_type").on(table.eventType),
    createdAtIdx: index("idx_ticket_events_created").on(table.createdAt),
  }),
);

export const insertTicketEventSchema = createInsertSchema(ticketEvents, {
  ticketId: z.string().uuid(),
  eventType: z.enum([
    "CREATED",
    "ACTIVATED",
    "VALIDATED",
    "USED",
    "EXPIRED",
    "CANCELLED",
    "REFUNDED",
    "TRANSFERRED",
  ]),
  description: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export const selectTicketEventSchema = createSelectSchema(ticketEvents);

export type InsertTicketEvent = z.infer<typeof insertTicketEventSchema>;
export type TicketEvent = typeof ticketEvents.$inferSelect;
