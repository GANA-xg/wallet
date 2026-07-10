CREATE TYPE "public"."device_status" AS ENUM('active', 'revoked', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('pending', 'verified', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."login_attempt_result" AS ENUM('success', 'invalid_otp', 'rate_limited', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('active', 'expired', 'revoked');--> statement-breakpoint
CREATE TABLE "cards" (
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
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"domain" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"plan" varchar(50) DEFAULT 'starter' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"phone" varchar(20) NOT NULL,
	"result" "login_attempt_result" NOT NULL,
	"ip_address" "inet",
	"device_identifier" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"replaced_by_token_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registered_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_name" varchar(255),
	"device_identifier" varchar(255) NOT NULL,
	"device_type" varchar(50),
	"push_token" text,
	"status" "device_status" DEFAULT 'active' NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"enrolled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" uuid,
	"refresh_token_hash" varchar(255),
	"ip_address" "inet",
	"user_agent" text,
	"status" "session_status" DEFAULT 'active' NOT NULL,
	"last_active_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"avatar_url" text,
	"kyc_status" "kyc_status" DEFAULT 'pending' NOT NULL,
	"kyc_verified_at" timestamp with time zone,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"biometric_enabled" boolean DEFAULT true NOT NULL,
	"pin_hash" varchar(255),
	"preferred_language" varchar(10) DEFAULT 'en',
	"is_active" boolean DEFAULT true NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registered_devices" ADD CONSTRAINT "registered_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_device_id_registered_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."registered_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_login_attempts_phone" ON "login_attempts" USING btree ("phone","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_session" ON "refresh_tokens" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_devices_user" ON "registered_devices" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_devices_identifier" ON "registered_devices" USING btree ("device_identifier");--> statement-breakpoint
CREATE INDEX "idx_sessions_active" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_expires" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_validate" ON "sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_tenant_phone" ON "users" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_users_tenant_email" ON "users" USING btree ("tenant_id","email");