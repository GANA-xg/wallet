import { integer, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cardsTable = pgTable("cards", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  cardNetwork: varchar("card_network", { length: 20 }).notNull(),
  issuer: text("issuer"),
  lastFour: varchar("last_four", { length: 4 }).notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  nickname: text("nickname").notNull().default("My Card"),
  theme: text("theme").notNull().default('{"gradientColors":["#2a2a2a","#222222"]}'),
  frozen: integer("frozen").notNull().default(0),
  balance: integer("balance").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCardSchema = createInsertSchema(cardsTable, {
  id: z.string().min(1),
  userId: z.string().min(1),
  cardNetwork: z.enum(["visa", "mastercard", "rupay", "amex", "discover", "unknown"]),
  issuer: z.string().nullable().optional(),
  lastFour: z.string().length(4),
  expiryMonth: z.number().int().min(1).max(12),
  expiryYear: z.number().int().min(2020).max(2099),
  nickname: z.string().min(1).max(100).default("My Card"),
  theme: z.string().default('{"gradientColors":["#2a2a2a","#222222"]}'),
  frozen: z.number().int().min(0).max(1).default(0),
  balance: z.number().int().min(0).default(0),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectCardSchema = createSelectSchema(cardsTable);

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;
