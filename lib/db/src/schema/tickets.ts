import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { ticketTypeEnum, ticketStatusEnum } from "./enums";

export const tickets = pgTable("tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  type: ticketTypeEnum("type").notNull(),
  pnr: varchar("pnr", { length: 20 }),
  title: varchar("title", { length: 255 }).notNull(),
  origin: varchar("origin", { length: 255 }),
  destination: varchar("destination", { length: 255 }),
  travelDate: timestamp("travel_date", { withTimezone: true }),
  seat: varchar("seat", { length: 50 }),
  qrPayload: text("qr_payload"),
  status: ticketStatusEnum("status").notNull().default("upcoming"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => ({
  userIdIdx: index("tickets_user_id_idx").on(table.userId),
  pnrIdx: index("tickets_pnr_idx").on(table.pnr),
}));

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;