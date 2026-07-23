import { pgTable, uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";

export const cards = pgTable("cards", {
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
