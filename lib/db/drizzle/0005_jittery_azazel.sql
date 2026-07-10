CREATE TYPE "public"."metro_card_status" AS ENUM('ACTIVE', 'INACTIVE', 'LOST', 'STOLEN', 'EXPIRED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."metro_pass_type" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'FLEX');--> statement-breakpoint
CREATE TYPE "public"."metro_transaction_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."metro_transaction_type" AS ENUM('RIDE', 'TOPUP', 'REFUND', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."reward_status" AS ENUM('ACTIVE', 'EXPIRED', 'DISABLED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."reward_transaction_type" AS ENUM('EARNED', 'REDEEMED', 'EXPIRED', 'ADJUSTED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('CASHBACK', 'POINTS', 'VOUCHER', 'PROMOTIONAL');--> statement-breakpoint
CREATE TYPE "public"."ticket_event_type" AS ENUM('CREATED', 'ACTIVATED', 'VALIDATED', 'USED', 'EXPIRED', 'CANCELLED', 'REFUNDED', 'TRANSFERRED');--> statement-breakpoint
CREATE TYPE "public"."ticket_qr_status" AS ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('CREATED', 'ACTIVE', 'USED', 'EXPIRED', 'CANCELLED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."ticket_type" AS ENUM('EVENT', 'TRANSPORT', 'MOVIE', 'FLIGHT', 'PARKING', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."ticket_validation_method" AS ENUM('QR_SCAN', 'NFC', 'MANUAL', 'API');--> statement-breakpoint
CREATE TYPE "public"."transport_mode" AS ENUM('BUS', 'METRO', 'TRAIN', 'FERRY', 'TRAM', 'MONORAIL', 'CAB', 'RENTAL', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."transport_operator_status" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"ticket_type" "ticket_type" NOT NULL,
	"status" "ticket_status" DEFAULT 'CREATED' NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"issuer_id" varchar(255),
	"issuer_name" varchar(255),
	"venue_name" varchar(255),
	"venue_address" text,
	"seat_number" varchar(100),
	"row_number" varchar(50),
	"section_name" varchar(100),
	"gate_info" varchar(100),
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"price" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'INR',
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_transferable" varchar(5) DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ticket_qrs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"qr_content" varchar(512) NOT NULL,
	"hash" varchar(128) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "ticket_qr_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "ticket_qrs_qr_content_unique" UNIQUE("qr_content"),
	CONSTRAINT "ticket_qrs_hash_unique" UNIQUE("hash")
);
--> statement-breakpoint
CREATE TABLE "ticket_validations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"ticket_qr_id" uuid,
	"validation_method" "ticket_validation_method" NOT NULL,
	"validator_id" varchar(255),
	"validator_device_id" varchar(255),
	"location" jsonb,
	"device_timestamp" timestamp with time zone,
	"result" varchar(50) DEFAULT 'VALID' NOT NULL,
	"failure_reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"event_type" "ticket_event_type" NOT NULL,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transport_operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" text,
	"supported_modes" varchar(255) NOT NULL,
	"cities" varchar(500),
	"contact_email" varchar(255),
	"contact_phone" varchar(20),
	"status" "transport_operator_status" DEFAULT 'ACTIVE' NOT NULL,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transport_operators_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "metro_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"card_number" varchar(50) NOT NULL,
	"card_label" varchar(255),
	"status" "metro_card_status" DEFAULT 'ACTIVE' NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"nfc_identifier" varchar(128),
	"nfc_metadata" varchar(1024),
	"qr_identifier" varchar(128),
	"last_used_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metro_cards_card_number_unique" UNIQUE("card_number")
);
--> statement-breakpoint
CREATE TABLE "metro_passes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"pass_type" "metro_pass_type" NOT NULL,
	"pass_identifier" varchar(100) NOT NULL,
	"price" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'INR',
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"remaining_uses" varchar(20),
	"is_auto_renew" varchar(5) DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metro_passes_pass_identifier_unique" UNIQUE("pass_identifier")
);
--> statement-breakpoint
CREATE TABLE "metro_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"metro_card_id" uuid,
	"metro_pass_id" uuid,
	"transaction_type" "metro_transaction_type" NOT NULL,
	"status" "metro_transaction_status" DEFAULT 'COMPLETED' NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR',
	"description" text,
	"reference_id" varchar(255),
	"external_ref_id" varchar(255),
	"device_id" varchar(255),
	"station_entry" varchar(255),
	"station_exit" varchar(255),
	"route_info" varchar(500),
	"tap_in_time" timestamp with time zone,
	"tap_out_time" timestamp with time zone,
	"offline_id" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metro_transactions_offline_id_unique" UNIQUE("offline_id")
);
--> statement-breakpoint
CREATE TABLE "transport_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"transport_mode" "transport_mode" NOT NULL,
	"vehicle_number" varchar(50),
	"route_id" varchar(100),
	"route_name" varchar(255),
	"start_stop" varchar(255),
	"end_stop" varchar(255),
	"city" varchar(100),
	"fare" numeric(12, 2),
	"currency" varchar(3) DEFAULT 'INR',
	"nfc_data" jsonb,
	"qr_data" jsonb,
	"device_id" varchar(255),
	"journey_started_at" timestamp with time zone,
	"journey_ended_at" timestamp with time zone,
	"is_offline_sync" varchar(5) DEFAULT 'false',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"reward_type" "reward_type" NOT NULL,
	"status" "reward_status" DEFAULT 'ACTIVE' NOT NULL,
	"value" numeric(12, 2),
	"currency" varchar(3),
	"points_cost" integer,
	"quantity" integer DEFAULT 0,
	"max_redemptions_per_user" integer,
	"image_url" varchar(500),
	"terms_conditions" text,
	"valid_from" timestamp with time zone,
	"valid_until" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_by" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reward_catalog_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reward_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"lifetime_earned" numeric(12, 2) DEFAULT '0' NOT NULL,
	"life_redeemed" numeric(12, 2) DEFAULT '0' NOT NULL,
	"points_balance" integer DEFAULT 0,
	"lifetime_points" integer DEFAULT 0,
	"next_expiry_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_type" "reward_type" NOT NULL,
	"transaction_type" "reward_transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"currency" varchar(3),
	"points_amount" integer,
	"balance_before" numeric(12, 2),
	"balance_after" numeric(12, 2),
	"description" text,
	"reference_id" varchar(255),
	"reward_catalog_id" uuid,
	"expires_at" timestamp with time zone,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_qrs" ADD CONSTRAINT "ticket_qrs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_validations" ADD CONSTRAINT "ticket_validations_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_validations" ADD CONSTRAINT "ticket_validations_ticket_qr_id_ticket_qrs_id_fk" FOREIGN KEY ("ticket_qr_id") REFERENCES "public"."ticket_qrs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_events" ADD CONSTRAINT "ticket_events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_cards" ADD CONSTRAINT "metro_cards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_cards" ADD CONSTRAINT "metro_cards_operator_id_transport_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."transport_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_passes" ADD CONSTRAINT "metro_passes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_passes" ADD CONSTRAINT "metro_passes_operator_id_transport_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."transport_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_transactions" ADD CONSTRAINT "metro_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_transactions" ADD CONSTRAINT "metro_transactions_operator_id_transport_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."transport_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_transactions" ADD CONSTRAINT "metro_transactions_metro_card_id_metro_cards_id_fk" FOREIGN KEY ("metro_card_id") REFERENCES "public"."metro_cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metro_transactions" ADD CONSTRAINT "metro_transactions_metro_pass_id_metro_passes_id_fk" FOREIGN KEY ("metro_pass_id") REFERENCES "public"."metro_passes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_usage" ADD CONSTRAINT "transport_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transport_usage" ADD CONSTRAINT "transport_usage_operator_id_transport_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."transport_operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_balances" ADD CONSTRAINT "reward_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_transactions" ADD CONSTRAINT "reward_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tickets_user" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_tickets_type" ON "tickets" USING btree ("ticket_type");--> statement-breakpoint
CREATE INDEX "idx_tickets_valid_from" ON "tickets" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "idx_tickets_valid_until" ON "tickets" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "idx_tickets_expiry" ON "tickets" USING btree ("valid_until","status");--> statement-breakpoint
CREATE INDEX "idx_tickets_issuer" ON "tickets" USING btree ("issuer_id");--> statement-breakpoint
CREATE INDEX "idx_tickets_active" ON "tickets" USING btree ("user_id","status","valid_until");--> statement-breakpoint
CREATE INDEX "idx_ticket_qr_ticket" ON "ticket_qrs" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_qr_content" ON "ticket_qrs" USING btree ("qr_content");--> statement-breakpoint
CREATE INDEX "idx_ticket_qr_hash" ON "ticket_qrs" USING btree ("hash");--> statement-breakpoint
CREATE INDEX "idx_ticket_qr_status" ON "ticket_qrs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_ticket_qr_lookup" ON "ticket_qrs" USING btree ("qr_content","status");--> statement-breakpoint
CREATE INDEX "idx_ticket_val_ticket" ON "ticket_validations" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_val_qr" ON "ticket_validations" USING btree ("ticket_qr_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_val_method" ON "ticket_validations" USING btree ("validation_method");--> statement-breakpoint
CREATE INDEX "idx_ticket_val_validator" ON "ticket_validations" USING btree ("validator_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_val_result" ON "ticket_validations" USING btree ("result");--> statement-breakpoint
CREATE INDEX "idx_ticket_val_created" ON "ticket_validations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ticket_events_ticket" ON "ticket_events" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_events_type" ON "ticket_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_ticket_events_created" ON "ticket_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_transport_operators_code" ON "transport_operators" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_transport_operators_status" ON "transport_operators" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transport_operators_name" ON "transport_operators" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_user" ON "metro_cards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_operator" ON "metro_cards" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_number" ON "metro_cards" USING btree ("card_number");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_status" ON "metro_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_nfc" ON "metro_cards" USING btree ("nfc_identifier");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_qr" ON "metro_cards" USING btree ("qr_identifier");--> statement-breakpoint
CREATE INDEX "idx_metro_cards_lookup" ON "metro_cards" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_user" ON "metro_passes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_operator" ON "metro_passes" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_type" ON "metro_passes" USING btree ("pass_type");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_identifier" ON "metro_passes" USING btree ("pass_identifier");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_from" ON "metro_passes" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_until" ON "metro_passes" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "idx_metro_passes_expiry" ON "metro_passes" USING btree ("valid_until","user_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_user" ON "metro_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_operator" ON "metro_transactions" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_card" ON "metro_transactions" USING btree ("metro_card_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_pass" ON "metro_transactions" USING btree ("metro_pass_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_type" ON "metro_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_status" ON "metro_transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_reference" ON "metro_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_external_ref" ON "metro_transactions" USING btree ("external_ref_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_offline" ON "metro_transactions" USING btree ("offline_id");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_tap_in" ON "metro_transactions" USING btree ("tap_in_time");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_created" ON "metro_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_metro_tx_user_history" ON "metro_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_user" ON "transport_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_operator" ON "transport_usage" USING btree ("operator_id");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_mode" ON "transport_usage" USING btree ("transport_mode");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_city" ON "transport_usage" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_route" ON "transport_usage" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_vehicle" ON "transport_usage" USING btree ("vehicle_number");--> statement-breakpoint
CREATE INDEX "idx_transport_usage_start" ON "transport_usage" USING btree ("journey_started_at");--> statement-breakpoint
CREATE INDEX "idx_reward_catalog_code" ON "reward_catalog" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_reward_catalog_type" ON "reward_catalog" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX "idx_reward_catalog_status" ON "reward_catalog" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_reward_catalog_from" ON "reward_catalog" USING btree ("valid_from");--> statement-breakpoint
CREATE INDEX "idx_reward_catalog_until" ON "reward_catalog" USING btree ("valid_until");--> statement-breakpoint
CREATE INDEX "idx_reward_balances_user" ON "reward_balances" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reward_balances_type" ON "reward_balances" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX "idx_reward_balances_expiry" ON "reward_balances" USING btree ("next_expiry_date");--> statement-breakpoint
CREATE INDEX "idx_reward_balances_user_type" ON "reward_balances" USING btree ("user_id","reward_type");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_user" ON "reward_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_type" ON "reward_transactions" USING btree ("reward_type");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_tx_type" ON "reward_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_reference" ON "reward_transactions" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_catalog" ON "reward_transactions" USING btree ("reward_catalog_id");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_expiry" ON "reward_transactions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_created" ON "reward_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_reward_tx_user_history" ON "reward_transactions" USING btree ("user_id","created_at");