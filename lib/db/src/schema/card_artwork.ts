import {
  boolean,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cardArtwork = pgTable("card_artwork", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  themeData: jsonb("theme_data").notNull().default({}),
  isSystem: boolean("is_system").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCardArtworkSchema = createInsertSchema(cardArtwork, {
  name: z.string().min(1).max(255),
  themeData: z.record(z.string(), z.unknown()).default({}),
  isSystem: z.boolean().default(false),
});

export const selectCardArtworkSchema = createSelectSchema(cardArtwork);

export type InsertCardArtwork = z.infer<typeof insertCardArtworkSchema>;
export type CardArtwork = typeof cardArtwork.$inferSelect;
