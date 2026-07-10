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
import { ticketValidationMethod } from "./enums";
import { tickets } from "./tickets";
import { ticketQrs } from "./ticket_qr";

export const ticketValidations = pgTable(
  "ticket_validations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id),
    ticketQrId: uuid("ticket_qr_id").references(() => ticketQrs.id),
    validationMethod: ticketValidationMethod("validation_method").notNull(),
    validatorId: varchar("validator_id", { length: 255 }),
    validatorDeviceId: varchar("validator_device_id", { length: 255 }),
    location: jsonb("location"),
    deviceTimestamp: timestamp("device_timestamp", { withTimezone: true }),
    result: varchar("result", { length: 50 }).notNull().default("VALID"),
    failureReason: text("failure_reason"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    ticketIdx: index("idx_ticket_val_ticket").on(table.ticketId),
    qrIdx: index("idx_ticket_val_qr").on(table.ticketQrId),
    methodIdx: index("idx_ticket_val_method").on(table.validationMethod),
    validatorIdx: index("idx_ticket_val_validator").on(table.validatorId),
    resultIdx: index("idx_ticket_val_result").on(table.result),
    createdAtIdx: index("idx_ticket_val_created").on(table.createdAt),
  }),
);

export const insertTicketValidationSchema = createInsertSchema(
  ticketValidations,
  {
    ticketId: z.string().uuid(),
    ticketQrId: z.string().uuid().nullable().optional(),
    validationMethod: z.enum(["QR_SCAN", "NFC", "MANUAL", "API"]),
    validatorId: z.string().max(255).nullable().optional(),
    validatorDeviceId: z.string().max(255).nullable().optional(),
    location: z.record(z.string(), z.unknown()).nullable().optional(),
    deviceTimestamp: z.string().datetime().nullable().optional(),
    result: z.string().max(50).default("VALID"),
    failureReason: z.string().nullable().optional(),
    metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  },
);

export const selectTicketValidationSchema = createSelectSchema(
  ticketValidations,
);

export type InsertTicketValidation = z.infer<
  typeof insertTicketValidationSchema
>;
export type TicketValidation = typeof ticketValidations.$inferSelect;
