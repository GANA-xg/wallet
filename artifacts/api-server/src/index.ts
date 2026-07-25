import "dotenv/config";
import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { getPool } from "@workspace/db";
import { initSocketServer, getIO } from "./lib/socketServer";
import { connectRedis } from "./lib/redis";

const httpServer = createServer(app);

const port = (() => {
  const raw = process.env.PORT;
  if (!raw) {
    logger.warn("PORT not set, defaulting to 3001");
    return 3001;
  }
  const n = Number(raw);
  if (Number.isNaN(n) || n <= 0) {
    logger.warn({ port: raw }, "Invalid PORT value, defaulting to 3001");
    return 3001;
  }
  return n;
})();

async function runMigrations() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.warn("DATABASE_URL not set — skipping migrations (auth will not work)");
    return;
  }
  try {
    const pool = getPool();
    const client = await pool.connect();
    try {
      // Drop old tables from previous schema versions, then recreate with new schema
      const statements = [
        // Drop old tables (no real data yet)
        `DROP TABLE IF EXISTS refresh_tokens CASCADE`,
        `DROP TABLE IF EXISTS registered_devices CASCADE`,
        `DROP TABLE IF EXISTS "cards" CASCADE`,
        `DROP TABLE IF EXISTS sessions CASCADE`,
        `DROP TABLE IF EXISTS wallets CASCADE`,
        `DROP TABLE IF EXISTS event_log CASCADE`,
        `DROP TABLE IF EXISTS audit_logs CASCADE`,
        `DROP TABLE IF EXISTS users CASCADE`,
        // Create ENUMs (IF NOT EXISTS handles re-runs)
        `DO $$ BEGIN CREATE TYPE kyc_status AS ENUM('pending','verified','rejected'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE theme_pref AS ENUM('dark','light','system'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE card_network AS ENUM('visa','mastercard','rupay'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE transaction_type AS ENUM('credit','debit'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE transaction_status AS ENUM('pending','success','failed','reconciling'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE transaction_source AS ENUM('upi_app','card','upi_lite','nfc'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE document_type AS ENUM('aadhaar','pan','driving_license','passport','vehicle_rc'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE ticket_type AS ENUM('flight','train','bus','movie','event'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE ticket_status AS ENUM('upcoming','completed','cancelled'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE reward_type AS ENUM('points','coupon','cashback','offer'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE notification_type AS ENUM('payment','security','reward','info'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE recurring_interval AS ENUM('monthly','weekly','yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE transport_pass_type AS ENUM('metro','bus','monthly','student'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE subscription_cadence AS ENUM('monthly','yearly'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN CREATE TYPE subscription_status AS ENUM('active','cancelled_by_user','ignored'); EXCEPTION WHEN duplicate_object THEN null; END $$`,
        // Users
        `CREATE TABLE "users" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "phone" varchar(15) NOT NULL,
          "name" varchar(120) NOT NULL,
          "email" varchar(255),
          "pin_hash" varchar(255) NOT NULL,
          "kyc_status" kyc_status DEFAULT 'pending' NOT NULL,
          "theme_pref" theme_pref DEFAULT 'dark' NOT NULL,
          "language" varchar(10) DEFAULT 'en-IN' NOT NULL,
          "created_at" timestamptz DEFAULT now() NOT NULL,
          "updated_at" timestamptz DEFAULT now() NOT NULL,
          "deleted_at" timestamptz
        )`,
        `CREATE UNIQUE INDEX IF NOT EXISTS users_phone_idx ON "users"("phone")`,
        `CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON "users"("email")`,
        // Devices
        `CREATE TABLE "devices" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "users"("id"),
          "device_fingerprint" varchar(255) NOT NULL,
          "push_token" text,
          "is_trusted" boolean DEFAULT false NOT NULL,
          "last_seen_at" timestamptz DEFAULT now() NOT NULL,
          "created_at" timestamptz DEFAULT now() NOT NULL,
          "updated_at" timestamptz DEFAULT now() NOT NULL,
          "deleted_at" timestamptz
        )`,
        `CREATE INDEX IF NOT EXISTS devices_user_id_idx ON "devices"("user_id")`,
        // Sessions
        `CREATE TABLE "sessions" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "users"("id"),
          "device_id" uuid REFERENCES "devices"("id"),
          "refresh_token_hash" varchar(255) NOT NULL,
          "expires_at" timestamptz NOT NULL,
          "revoked_at" timestamptz,
          "created_at" timestamptz DEFAULT now() NOT NULL,
          "updated_at" timestamptz DEFAULT now() NOT NULL,
          "deleted_at" timestamptz
        )`,
        `CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON "sessions"("user_id")`,
        // Wallets
        `CREATE TABLE "wallets" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL UNIQUE REFERENCES "users"("id"),
          "balance_paise" bigint DEFAULT 0 NOT NULL,
          "upi_lite_paise" bigint DEFAULT 0 NOT NULL,
          "created_at" timestamptz DEFAULT now() NOT NULL,
          "updated_at" timestamptz DEFAULT now() NOT NULL,
          "deleted_at" timestamptz
        )`,
        // Cards
        `CREATE TABLE "cards" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "users"("id"),
          "encrypted_number" text NOT NULL,
          "last_four" varchar(4) NOT NULL,
          "holder_name" varchar(255) NOT NULL,
          "expiry_month" smallint NOT NULL,
          "expiry_year" smallint NOT NULL,
          "network" card_network NOT NULL,
          "bank_name" varchar(255),
          "gradient_colors" jsonb,
          "is_frozen" boolean DEFAULT false NOT NULL,
          "created_at" timestamptz DEFAULT now() NOT NULL,
          "updated_at" timestamptz DEFAULT now() NOT NULL,
          "deleted_at" timestamptz
        )`,
        `CREATE INDEX IF NOT EXISTS cards_user_id_idx ON "cards"("user_id")`,
        // notifications (needed for auth flow - money sent notifications)
        `CREATE TABLE "notifications" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL REFERENCES "users"("id"),
          "type" notification_type NOT NULL,
          "title" varchar(255) NOT NULL,
          "body" text NOT NULL,
          "is_read" boolean DEFAULT false NOT NULL,
          "created_at" timestamptz DEFAULT now() NOT NULL,
          "updated_at" timestamptz DEFAULT now() NOT NULL,
          "deleted_at" timestamptz
        )`,
        `CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON "notifications"("user_id")`,
      ];
      for (const sql of statements) {
        await client.query(sql);
      }
      logger.info("Database migrations completed — new schema applied");
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ err: error }, "Database migration failed — server will start but auth may not work");
  }
}

async function start() {
  await runMigrations();

  // Initialize Redis (best-effort)
  try {
    await connectRedis();
  } catch (err) {
    logger.warn({ err }, "Redis connection failed — OTP will use in-memory fallback");
  }

  // Initialize Socket.IO
  initSocketServer(httpServer);

  httpServer.listen(port, () => {
    logger.info({ port }, "Server listening");
  });
}

start();
