import {
  index,
  jsonb,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { transportMode } from "./enums";
import { users } from "./auth";
import { transportOperators } from "./transport_operators";

export const transportUsage = pgTable(
  "transport_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => transportOperators.id),
    transportMode: transportMode("transport_mode").notNull(),
    vehicleNumber: varchar("vehicle_number", { length: 50 }),
    routeId: varchar("route_id", { length: 100 }),
    routeName: varchar("route_name", { length: 255 }),
    startStop: varchar("start_stop", { length: 255 }),
    endStop: varchar("end_stop", { length: 255 }),
    city: varchar("city", { length: 100 }),
    fare: numeric("fare", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 3 }).default("INR"),
    nfcData: jsonb("nfc_data"),
    qrData: jsonb("qr_data"),
    deviceId: varchar("device_id", { length: 255 }),
    journeyStartedAt: timestamp("journey_started_at", {
      withTimezone: true,
    }),
    journeyEndedAt: timestamp("journey_ended_at", { withTimezone: true }),
    isOfflineSync: varchar("is_offline_sync", { length: 5 }).default("false"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_transport_usage_user").on(table.userId),
    operatorIdx: index("idx_transport_usage_operator").on(table.operatorId),
    modeIdx: index("idx_transport_usage_mode").on(table.transportMode),
    cityIdx: index("idx_transport_usage_city").on(table.city),
    routeIdx: index("idx_transport_usage_route").on(table.routeId),
    vehicleIdx: index("idx_transport_usage_vehicle").on(table.vehicleNumber),
    startIdx: index("idx_transport_usage_start").on(table.journeyStartedAt),
  }),
);

export const insertTransportUsageSchema = createInsertSchema(transportUsage, {
  userId: z.string().uuid(),
  operatorId: z.string().uuid(),
  transportMode: z.enum([
    "BUS",
    "METRO",
    "TRAIN",
    "FERRY",
    "TRAM",
    "MONORAIL",
    "CAB",
    "RENTAL",
    "OTHER",
  ]),
  vehicleNumber: z.string().max(50).nullable().optional(),
  routeId: z.string().max(100).nullable().optional(),
  routeName: z.string().max(255).nullable().optional(),
  startStop: z.string().max(255).nullable().optional(),
  endStop: z.string().max(255).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  fare: z.string().nullable().optional(),
  currency: z.string().max(3).default("INR"),
  nfcData: z.record(z.string(), z.unknown()).nullable().optional(),
  qrData: z.record(z.string(), z.unknown()).nullable().optional(),
  deviceId: z.string().max(255).nullable().optional(),
  journeyStartedAt: z.string().datetime().nullable().optional(),
  journeyEndedAt: z.string().datetime().nullable().optional(),
  isOfflineSync: z.string().max(5).default("false"),
});

export const selectTransportUsageSchema = createSelectSchema(transportUsage);

export type InsertTransportUsage = z.infer<typeof insertTransportUsageSchema>;
export type TransportUsage = typeof transportUsage.$inferSelect;
