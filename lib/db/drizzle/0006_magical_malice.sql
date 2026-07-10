CREATE TYPE "public"."pg_credential_status" AS ENUM('ACTIVE', 'INACTIVE', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."pg_payment_status" AS ENUM('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."pg_provider_code" AS ENUM('RAZORPAY', 'GPAY', 'PHONEPE');--> statement-breakpoint
CREATE TYPE "public"."pg_refund_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."pg_webhook_event_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "pg_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" "pg_provider_code" NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"supported_currencies" varchar(255),
	"supported_methods" varchar(500),
	"base_url" varchar(500),
	"webhook_secret" varchar(500),
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pg_providers_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "pg_credentials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pg_provider_id" uuid NOT NULL,
	"merchant_id" uuid,
	"label" varchar(100) NOT NULL,
	"status" "pg_credential_status" DEFAULT 'ACTIVE' NOT NULL,
	"api_key" varchar(500),
	"api_secret" varchar(1000),
	"merchant_id_ref" varchar(255),
	"salt" varchar(255),
	"environment" varchar(20) DEFAULT 'sandbox' NOT NULL,
	"webhook_secret" varchar(500),
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg_payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"pg_provider_id" uuid NOT NULL,
	"pg_credential_id" uuid NOT NULL,
	"pg_payment_id" varchar(255),
	"pg_order_id" varchar(255),
	"pg_payment_method" varchar(100),
	"status" "pg_payment_status" DEFAULT 'PENDING' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"pg_fee" numeric(12, 2),
	"pg_tax" numeric(12, 2),
	"gateway_response" jsonb,
	"error_code" varchar(100),
	"error_message" text,
	"instrument_response" jsonb,
	"checkout_url" varchar(1024),
	"payment_link_id" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pg_provider_id" uuid NOT NULL,
	"event_id" varchar(255),
	"event_type" varchar(100) NOT NULL,
	"status" "pg_webhook_event_status" DEFAULT 'PENDING' NOT NULL,
	"headers" jsonb,
	"raw_body" text,
	"parsed_body" jsonb,
	"signature" varchar(500),
	"signature_valid" varchar(5),
	"processing_error" text,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pg_refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pg_payment_intent_id" uuid NOT NULL,
	"pg_refund_id" varchar(255),
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"status" "pg_refund_status" DEFAULT 'PENDING' NOT NULL,
	"reason" text,
	"gateway_response" text,
	"refund_speed" varchar(50),
	"initiated_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pg_credentials" ADD CONSTRAINT "pg_credentials_pg_provider_id_pg_providers_id_fk" FOREIGN KEY ("pg_provider_id") REFERENCES "public"."pg_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg_credentials" ADD CONSTRAINT "pg_credentials_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg_payment_intents" ADD CONSTRAINT "pg_payment_intents_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg_payment_intents" ADD CONSTRAINT "pg_payment_intents_pg_provider_id_pg_providers_id_fk" FOREIGN KEY ("pg_provider_id") REFERENCES "public"."pg_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg_payment_intents" ADD CONSTRAINT "pg_payment_intents_pg_credential_id_pg_credentials_id_fk" FOREIGN KEY ("pg_credential_id") REFERENCES "public"."pg_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg_webhook_events" ADD CONSTRAINT "pg_webhook_events_pg_provider_id_pg_providers_id_fk" FOREIGN KEY ("pg_provider_id") REFERENCES "public"."pg_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pg_refunds" ADD CONSTRAINT "pg_refunds_pg_payment_intent_id_pg_payment_intents_id_fk" FOREIGN KEY ("pg_payment_intent_id") REFERENCES "public"."pg_payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pg_providers_code" ON "pg_providers" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_pg_providers_active" ON "pg_providers" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_pg_creds_provider" ON "pg_credentials" USING btree ("pg_provider_id");--> statement-breakpoint
CREATE INDEX "idx_pg_creds_merchant" ON "pg_credentials" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_pg_creds_status" ON "pg_credentials" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_creds_env" ON "pg_credentials" USING btree ("environment");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_payment_intent" ON "pg_payment_intents" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_provider" ON "pg_payment_intents" USING btree ("pg_provider_id");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_credential" ON "pg_payment_intents" USING btree ("pg_credential_id");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_pg_payment" ON "pg_payment_intents" USING btree ("pg_payment_id");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_pg_order" ON "pg_payment_intents" USING btree ("pg_order_id");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_status" ON "pg_payment_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_pi_link" ON "pg_payment_intents" USING btree ("payment_link_id");--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_provider" ON "pg_webhook_events" USING btree ("pg_provider_id");--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_event_id" ON "pg_webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_type" ON "pg_webhook_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_status" ON "pg_webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_pg_webhook_idempotency" ON "pg_webhook_events" USING btree ("pg_provider_id","event_id");--> statement-breakpoint
CREATE INDEX "idx_pg_refunds_pg_pi" ON "pg_refunds" USING btree ("pg_payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_pg_refunds_pg_refund" ON "pg_refunds" USING btree ("pg_refund_id");--> statement-breakpoint
CREATE INDEX "idx_pg_refunds_status" ON "pg_refunds" USING btree ("status");