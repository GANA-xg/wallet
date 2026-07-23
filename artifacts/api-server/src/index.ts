import "dotenv/config";
import app from "./app";
import { logger } from "./lib/logger";
import { getPool } from "@workspace/db";

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
      const statements = [
        `CREATE TABLE IF NOT EXISTS "users" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "tenant_id" uuid NOT NULL,
          "phone" varchar(20) NOT NULL,
          "email" varchar(255),
          "name" varchar(255),
          "avatar_url" text,
          "kyc_status" varchar(20) DEFAULT 'pending' NOT NULL,
          "two_factor_enabled" boolean DEFAULT false NOT NULL,
          "biometric_enabled" boolean DEFAULT true NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL,
          "updated_at" timestamp with time zone DEFAULT now() NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS "sessions" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL,
          "device_id" uuid,
          "refresh_token_hash" varchar(255),
          "ip_address" varchar(45),
          "user_agent" text,
          "last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
          "expires_at" timestamp with time zone NOT NULL,
          "revoked_at" timestamp with time zone,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS "registered_devices" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" uuid NOT NULL,
          "device_name" varchar(255),
          "device_identifier" varchar(255) NOT NULL,
          "push_token" text,
          "last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
          "enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
          "revoked_at" timestamp with time zone
        )`,
        `CREATE TABLE IF NOT EXISTS "cards" (
          "id" text PRIMARY KEY NOT NULL,
          "user_id" text NOT NULL,
          "card_network" varchar(20) NOT NULL,
          "issuer" text,
          "last_four" varchar(4) NOT NULL,
          "expiry_month" integer NOT NULL,
          "expiry_year" integer NOT NULL,
          "nickname" text DEFAULT 'My Card' NOT NULL,
          "theme" text DEFAULT '{"gradientColors":["#2a2a2a","#222222"]}' NOT NULL,
          "frozen" integer DEFAULT 0 NOT NULL,
          "balance" integer DEFAULT 0 NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS "refresh_tokens" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "session_id" uuid NOT NULL,
          "token_hash" varchar(255) NOT NULL,
          "expires_at" timestamp with time zone NOT NULL,
          "created_at" timestamp with time zone DEFAULT now() NOT NULL
        )`,
        `DO $$ BEGIN
          ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN
          ALTER TABLE "registered_devices" ADD CONSTRAINT "registered_devices_user_id_users_id_fk"
            FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null; END $$`,
        `DO $$ BEGIN
          ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_sessions_id_fk"
            FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;
        EXCEPTION WHEN duplicate_object THEN null; END $$`,
      ];
      for (const sql of statements) {
        await client.query(sql);
      }
      logger.info("Database migrations completed");
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ err: error }, "Database migration failed — server will start but auth may not work");
  }
}

async function start() {
  await runMigrations();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start();
