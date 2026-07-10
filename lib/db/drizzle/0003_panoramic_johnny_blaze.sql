CREATE TYPE "public"."beneficiary_type" AS ENUM('UPI', 'WALLET', 'BANK');--> statement-breakpoint
CREATE TYPE "public"."beneficiary_verification_status" AS ENUM('pending', 'verified', 'failed');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('active', 'frozen', 'suspended', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."mandate_frequency" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONCE', 'ADHOC');--> statement-breakpoint
CREATE TYPE "public"."merchant_settlement_schedule" AS ENUM('T_1', 'T_2', 'T_PLUS_2', 'WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."merchant_status" AS ENUM('pending', 'active', 'suspended', 'closed');--> statement-breakpoint
CREATE TYPE "public"."merchant_terminal_status" AS ENUM('active', 'inactive', 'suspended', 'decommissioned');--> statement-breakpoint
CREATE TYPE "public"."merchant_terminal_type" AS ENUM('POS', 'QR', 'NFC', 'ECOM');--> statement-breakpoint
CREATE TYPE "public"."token_status" AS ENUM('active', 'suspended', 'expired', 'rotated');--> statement-breakpoint
CREATE TYPE "public"."upi_collect_status" AS ENUM('pending', 'accepted', 'rejected', 'expired', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."upi_handle_status" AS ENUM('active', 'inactive', 'suspended', 'released');--> statement-breakpoint
CREATE TYPE "public"."upi_mandate_status" AS ENUM('active', 'paused', 'cancelled', 'expired', 'completed');--> statement-breakpoint
CREATE TABLE "card_artwork" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"theme_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "physical_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"cardholder_name" varchar(255) NOT NULL,
	"card_network" varchar(20) NOT NULL,
	"issuer" varchar(255),
	"last_four" varchar(4) NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"token_reference" varchar(255),
	"nickname" varchar(255),
	"artwork_id" uuid,
	"status" "card_status" DEFAULT 'active' NOT NULL,
	"is_pin_set" boolean DEFAULT false NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"frozen_at" timestamp with time zone,
	"replaced_by_card_id" uuid,
	"replaced_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "physical_cards_token_reference_unique" UNIQUE("token_reference")
);
--> statement-breakpoint
CREATE TABLE "virtual_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"card_network" varchar(20) NOT NULL,
	"issuer" varchar(255),
	"last_four" varchar(4) NOT NULL,
	"expiry_month" integer NOT NULL,
	"expiry_year" integer NOT NULL,
	"token_reference" varchar(255),
	"nickname" varchar(255),
	"artwork_id" uuid,
	"status" "card_status" DEFAULT 'active' NOT NULL,
	"is_network_tokenized" boolean DEFAULT true NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"frozen_at" timestamp with time zone,
	"replaced_by_card_id" uuid,
	"replaced_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "virtual_cards_token_reference_unique" UNIQUE("token_reference")
);
--> statement-breakpoint
CREATE TABLE "network_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_reference" varchar(255) NOT NULL,
	"card_type" varchar(20) NOT NULL,
	"card_id" uuid NOT NULL,
	"token_expires_at" timestamp with time zone NOT NULL,
	"status" "token_status" DEFAULT 'active' NOT NULL,
	"rotated_from_token_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "network_tokens_token_reference_unique" UNIQUE("token_reference")
);
--> statement-breakpoint
CREATE TABLE "upi_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"phone_number" varchar(20),
	"account_provider" varchar(100) NOT NULL,
	"provider_reference" varchar(255),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upi_handles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upi_account_id" uuid NOT NULL,
	"handle" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" "upi_handle_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upi_handles_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "upi_collect_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payer_handle_id" uuid NOT NULL,
	"payee_handle_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"note" text,
	"status" "upi_collect_status" DEFAULT 'pending' NOT NULL,
	"payment_intent_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upi_mandates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payer_handle_id" uuid NOT NULL,
	"payee_handle_id" uuid NOT NULL,
	"mandate_reference" varchar(255) NOT NULL,
	"amount" numeric(15, 2),
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"frequency" "mandate_frequency" NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"max_amount_per_transaction" numeric(15, 2),
	"status" "upi_mandate_status" DEFAULT 'active' NOT NULL,
	"payment_intent_id" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upi_mandates_mandate_reference_unique" UNIQUE("mandate_reference")
);
--> statement-breakpoint
CREATE TABLE "upi_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"upi_account_id" uuid NOT NULL,
	"device_identifier" varchar(255) NOT NULL,
	"device_name" varchar(255),
	"os_type" varchar(50),
	"app_version" varchar(50),
	"is_verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"beneficiary_type" "beneficiary_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"nickname" varchar(255),
	"is_favorite" boolean DEFAULT false NOT NULL,
	"transfer_limit_per_txn" numeric(15, 2),
	"transfer_limit_daily" numeric(15, 2),
	"verification_status" "beneficiary_verification_status" DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	CONSTRAINT "merchant_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "merchants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"gstin" varchar(50),
	"pan" varchar(20),
	"merchant_identifier" varchar(100) NOT NULL,
	"status" "merchant_status" DEFAULT 'pending' NOT NULL,
	"category_code" varchar(10),
	"logo_url" text,
	"website" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchants_merchant_identifier_unique" UNIQUE("merchant_identifier")
);
--> statement-breakpoint
CREATE TABLE "merchant_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(100) DEFAULT 'IN' NOT NULL,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_terminals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"merchant_location_id" uuid,
	"terminal_identifier" varchar(100) NOT NULL,
	"terminal_type" "merchant_terminal_type" NOT NULL,
	"serial_number" varchar(100),
	"status" "merchant_terminal_status" DEFAULT 'active' NOT NULL,
	"is_qr" boolean DEFAULT false NOT NULL,
	"qr_code_data" text,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "merchant_terminals_terminal_identifier_unique" UNIQUE("terminal_identifier")
);
--> statement-breakpoint
CREATE TABLE "merchant_settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"merchant_id" uuid NOT NULL,
	"account_id" uuid,
	"settlement_account_reference" varchar(255) NOT NULL,
	"settlement_schedule" "merchant_settlement_schedule" NOT NULL,
	"minimum_settlement_amount" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "physical_cards" ADD CONSTRAINT "physical_cards_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "physical_cards" ADD CONSTRAINT "physical_cards_artwork_id_card_artwork_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."card_artwork"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_cards" ADD CONSTRAINT "virtual_cards_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "virtual_cards" ADD CONSTRAINT "virtual_cards_artwork_id_card_artwork_id_fk" FOREIGN KEY ("artwork_id") REFERENCES "public"."card_artwork"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_accounts" ADD CONSTRAINT "upi_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_handles" ADD CONSTRAINT "upi_handles_upi_account_id_upi_accounts_id_fk" FOREIGN KEY ("upi_account_id") REFERENCES "public"."upi_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_collect_requests" ADD CONSTRAINT "upi_collect_requests_payer_handle_id_upi_handles_id_fk" FOREIGN KEY ("payer_handle_id") REFERENCES "public"."upi_handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_collect_requests" ADD CONSTRAINT "upi_collect_requests_payee_handle_id_upi_handles_id_fk" FOREIGN KEY ("payee_handle_id") REFERENCES "public"."upi_handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_collect_requests" ADD CONSTRAINT "upi_collect_requests_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_mandates" ADD CONSTRAINT "upi_mandates_payer_handle_id_upi_handles_id_fk" FOREIGN KEY ("payer_handle_id") REFERENCES "public"."upi_handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_mandates" ADD CONSTRAINT "upi_mandates_payee_handle_id_upi_handles_id_fk" FOREIGN KEY ("payee_handle_id") REFERENCES "public"."upi_handles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_mandates" ADD CONSTRAINT "upi_mandates_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upi_devices" ADD CONSTRAINT "upi_devices_upi_account_id_upi_accounts_id_fk" FOREIGN KEY ("upi_account_id") REFERENCES "public"."upi_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchants" ADD CONSTRAINT "merchants_category_code_merchant_categories_code_fk" FOREIGN KEY ("category_code") REFERENCES "public"."merchant_categories"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_locations" ADD CONSTRAINT "merchant_locations_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_terminals" ADD CONSTRAINT "merchant_terminals_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_terminals" ADD CONSTRAINT "merchant_terminals_merchant_location_id_merchant_locations_id_fk" FOREIGN KEY ("merchant_location_id") REFERENCES "public"."merchant_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_settlements" ADD CONSTRAINT "merchant_settlements_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_settlements" ADD CONSTRAINT "merchant_settlements_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_physical_cards_wallet" ON "physical_cards" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_physical_cards_status" ON "physical_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_physical_cards_expiry" ON "physical_cards" USING btree ("expiry_year","expiry_month");--> statement-breakpoint
CREATE INDEX "idx_virtual_cards_wallet" ON "virtual_cards" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_virtual_cards_status" ON "virtual_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_virtual_cards_expiry" ON "virtual_cards" USING btree ("expiry_year","expiry_month");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_network_tokens_reference" ON "network_tokens" USING btree ("token_reference");--> statement-breakpoint
CREATE INDEX "idx_network_tokens_card" ON "network_tokens" USING btree ("card_type","card_id");--> statement-breakpoint
CREATE INDEX "idx_network_tokens_status" ON "network_tokens" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_network_tokens_rotation" ON "network_tokens" USING btree ("rotated_from_token_id");--> statement-breakpoint
CREATE INDEX "idx_upi_accounts_user" ON "upi_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_upi_accounts_provider" ON "upi_accounts" USING btree ("account_provider");--> statement-breakpoint
CREATE INDEX "idx_upi_accounts_status" ON "upi_accounts" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_upi_handles_value" ON "upi_handles" USING btree ("handle");--> statement-breakpoint
CREATE INDEX "idx_upi_handles_account" ON "upi_handles" USING btree ("upi_account_id");--> statement-breakpoint
CREATE INDEX "idx_upi_handles_primary" ON "upi_handles" USING btree ("upi_account_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_upi_handles_status" ON "upi_handles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upi_collect_payer" ON "upi_collect_requests" USING btree ("payer_handle_id");--> statement-breakpoint
CREATE INDEX "idx_upi_collect_payee" ON "upi_collect_requests" USING btree ("payee_handle_id");--> statement-breakpoint
CREATE INDEX "idx_upi_collect_status" ON "upi_collect_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upi_collect_intent" ON "upi_collect_requests" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_upi_collect_expires" ON "upi_collect_requests" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_upi_mandates_reference" ON "upi_mandates" USING btree ("mandate_reference");--> statement-breakpoint
CREATE INDEX "idx_upi_mandates_payer" ON "upi_mandates" USING btree ("payer_handle_id");--> statement-breakpoint
CREATE INDEX "idx_upi_mandates_payee" ON "upi_mandates" USING btree ("payee_handle_id");--> statement-breakpoint
CREATE INDEX "idx_upi_mandates_status" ON "upi_mandates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_upi_mandates_intent" ON "upi_mandates" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_upi_mandates_expiry" ON "upi_mandates" USING btree ("end_date");--> statement-breakpoint
CREATE INDEX "idx_upi_devices_account" ON "upi_devices" USING btree ("upi_account_id");--> statement-breakpoint
CREATE INDEX "idx_upi_devices_identifier" ON "upi_devices" USING btree ("device_identifier");--> statement-breakpoint
CREATE INDEX "idx_upi_devices_verified" ON "upi_devices" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_user" ON "beneficiaries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_type" ON "beneficiaries" USING btree ("beneficiary_type");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_favorite" ON "beneficiaries" USING btree ("user_id","is_favorite");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_reference" ON "beneficiaries" USING btree ("beneficiary_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_verification" ON "beneficiaries" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_beneficiaries_last_used" ON "beneficiaries" USING btree ("last_used_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_merchants_identifier" ON "merchants" USING btree ("merchant_identifier");--> statement-breakpoint
CREATE INDEX "idx_merchants_name" ON "merchants" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_merchants_category" ON "merchants" USING btree ("category_code");--> statement-breakpoint
CREATE INDEX "idx_merchants_status" ON "merchants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_merchants_email" ON "merchants" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_merchant_locations_merchant" ON "merchant_locations" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_locations_city" ON "merchant_locations" USING btree ("city");--> statement-breakpoint
CREATE INDEX "idx_merchant_locations_active" ON "merchant_locations" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_merchant_terminals_identifier" ON "merchant_terminals" USING btree ("terminal_identifier");--> statement-breakpoint
CREATE INDEX "idx_merchant_terminals_merchant" ON "merchant_terminals" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_terminals_location" ON "merchant_terminals" USING btree ("merchant_location_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_terminals_type" ON "merchant_terminals" USING btree ("terminal_type");--> statement-breakpoint
CREATE INDEX "idx_merchant_terminals_status" ON "merchant_terminals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_merchant_terminals_qr" ON "merchant_terminals" USING btree ("is_qr");--> statement-breakpoint
CREATE INDEX "idx_merchant_settlements_merchant" ON "merchant_settlements" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_settlements_account" ON "merchant_settlements" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_settlements_active" ON "merchant_settlements" USING btree ("is_active");--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_merchant_id_merchants_id_fk" FOREIGN KEY ("merchant_id") REFERENCES "public"."merchants"("id") ON DELETE no action ON UPDATE no action;