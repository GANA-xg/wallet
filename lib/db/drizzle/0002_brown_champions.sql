CREATE TYPE "public"."payment_hold_status" AS ENUM('AUTHORIZED', 'CAPTURED', 'VOIDED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."payment_intent_status" AS ENUM('CREATED', 'AUTHORIZED', 'CAPTURED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."reconciliation_status" AS ENUM('MATCHED', 'MISMATCHED', 'PENDING', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."recurring_frequency" AS ENUM('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."recurring_status" AS ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'COMPLETED');--> statement-breakpoint
CREATE TYPE "public"."retry_policy" AS ENUM('IMMEDIATE', 'EXPONENTIAL', 'FIXED_INTERVAL');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('PENDING', 'SETTLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('PENDING', 'SUCCESS', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('PAYMENT', 'REFUND', 'TRANSFER', 'WITHDRAWAL', 'DEPOSIT', 'FEE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TABLE "payment_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"merchant_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"exchange_rate" numeric(10, 6),
	"status" "payment_intent_status" DEFAULT 'CREATED' NOT NULL,
	CONSTRAINT "payment_intents_amount_check" CHECK ("amount" > 0),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"idempotency_key" varchar(255),
	"expires_at" timestamp with time zone NOT NULL,
	"authorized_at" timestamp with time zone,
	"captured_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"transaction_reference" varchar(100) NOT NULL,
	"external_reference" varchar(255),
	"provider_reference" varchar(255),
	"reconciliation_reference" varchar(255),
	"user_id" uuid NOT NULL,
	"merchant_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"exchange_rate" numeric(10, 6),
	"status" "transaction_status" DEFAULT 'PENDING' NOT NULL,
	"type" "transaction_type" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_transaction_reference_unique" UNIQUE("transaction_reference"),
	CONSTRAINT "transactions_amount_check" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "payment_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_intent_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"status" "payment_hold_status" DEFAULT 'AUTHORIZED' NOT NULL,
	CONSTRAINT "payment_holds_amount_check" CHECK ("amount" > 0),
	"expires_at" timestamp with time zone NOT NULL,
	"captured_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"exchange_rate" numeric(10, 6),
	"scheduled_at" timestamp with time zone NOT NULL,
	"executed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"payment_intent_id" uuid,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"max_retries" integer DEFAULT 0 NOT NULL,
	"retry_policy" "retry_policy",
	"next_retry_at" timestamp with time zone,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_payments_amount_check" CHECK ("amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "recurring_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"scheduled_payment_id" uuid,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"exchange_rate" numeric(10, 6),
	"frequency" "recurring_frequency" NOT NULL,
	CONSTRAINT "recurring_payments_amount_check" CHECK ("amount" > 0),
	"interval_count" integer DEFAULT 1 NOT NULL,
	"start_at" timestamp with time zone NOT NULL,
	"end_at" timestamp with time zone,
	"next_execution_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_execution_at" timestamp with time zone,
	"status" "recurring_status" DEFAULT 'ACTIVE' NOT NULL,
	"max_occurrences" integer,
	"occurrences_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"settlement_reference" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"provider_settlement_id" varchar(255),
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"exchange_rate" numeric(10, 6),
	"status" "settlement_status" DEFAULT 'PENDING' NOT NULL,
	CONSTRAINT "settlements_amount_check" CHECK ("amount" > 0),
	"settled_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "settlements_settlement_reference_unique" UNIQUE("settlement_reference")
);
--> statement-breakpoint
CREATE TABLE "reconciliation_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_reference" varchar(100) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"total_items" integer DEFAULT 0 NOT NULL,
	"matched_count" integer DEFAULT 0 NOT NULL,
	"mismatched_count" integer DEFAULT 0 NOT NULL,
	"pending_count" integer DEFAULT 0 NOT NULL,
	"disputed_count" integer DEFAULT 0 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reconciliation_batches_batch_reference_unique" UNIQUE("batch_reference")
);
--> statement-breakpoint
CREATE TABLE "reconciliation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reconciliation_batch_id" uuid NOT NULL,
	"transaction_id" uuid,
	"settlement_id" uuid,
	"provider_reference" varchar(255) NOT NULL,
	"expected_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"actual_amount" numeric(15, 2),
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"status" "reconciliation_status" DEFAULT 'PENDING' NOT NULL,
	"discrepancy" numeric(15, 2),
	"notes" text,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_intents" ADD CONSTRAINT "payment_intents_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_holds" ADD CONSTRAINT "payment_holds_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_holds" ADD CONSTRAINT "payment_holds_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scheduled_payments" ADD CONSTRAINT "scheduled_payments_payment_intent_id_payment_intents_id_fk" FOREIGN KEY ("payment_intent_id") REFERENCES "public"."payment_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recurring_payments" ADD CONSTRAINT "recurring_payments_scheduled_payment_id_scheduled_payments_id_fk" FOREIGN KEY ("scheduled_payment_id") REFERENCES "public"."scheduled_payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_reconciliation_batch_id_reconciliation_batches_id_fk" FOREIGN KEY ("reconciliation_batch_id") REFERENCES "public"."reconciliation_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reconciliation_items" ADD CONSTRAINT "reconciliation_items_settlement_id_settlements_id_fk" FOREIGN KEY ("settlement_id") REFERENCES "public"."settlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_payment_intents_user" ON "payment_intents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_wallet" ON "payment_intents" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_status" ON "payment_intents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_intents_idempotency" ON "payment_intents" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_merchant" ON "payment_intents" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_payment_intents_expires" ON "payment_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_transactions_payment_intent" ON "transactions" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_user" ON "transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_merchant" ON "transactions" USING btree ("merchant_id");--> statement-breakpoint
CREATE INDEX "idx_transactions_status" ON "transactions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_transactions_provider_ref" ON "transactions" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "idx_transactions_external_ref" ON "transactions" USING btree ("external_reference");--> statement-breakpoint
CREATE INDEX "idx_transactions_reconciliation_ref" ON "transactions" USING btree ("reconciliation_reference");--> statement-breakpoint
CREATE INDEX "idx_holds_payment_intent" ON "payment_holds" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_holds_account" ON "payment_holds" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_holds_status" ON "payment_holds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_holds_expires" ON "payment_holds" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_payments_user" ON "scheduled_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_payments_wallet" ON "scheduled_payments" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_scheduled_payments_time" ON "scheduled_payments" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_payments_next_retry" ON "scheduled_payments" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_scheduled_payments_intent" ON "scheduled_payments" USING btree ("payment_intent_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_payments_user" ON "recurring_payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_payments_wallet" ON "recurring_payments" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_recurring_payments_status" ON "recurring_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_recurring_payments_next" ON "recurring_payments" USING btree ("next_execution_at");--> statement-breakpoint
CREATE INDEX "idx_recurring_payments_template" ON "recurring_payments" USING btree ("scheduled_payment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settlements_reference" ON "settlements" USING btree ("settlement_reference");--> statement-breakpoint
CREATE INDEX "idx_settlements_provider" ON "settlements" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_settlements_status" ON "settlements" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_settlements_settled" ON "settlements" USING btree ("settled_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recon_batches_reference" ON "reconciliation_batches" USING btree ("batch_reference");--> statement-breakpoint
CREATE INDEX "idx_recon_batches_provider" ON "reconciliation_batches" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_recon_batches_completed" ON "reconciliation_batches" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_recon_items_batch" ON "reconciliation_items" USING btree ("reconciliation_batch_id");--> statement-breakpoint
CREATE INDEX "idx_recon_items_transaction" ON "reconciliation_items" USING btree ("transaction_id");--> statement-breakpoint
CREATE INDEX "idx_recon_items_settlement" ON "reconciliation_items" USING btree ("settlement_id");--> statement-breakpoint
CREATE INDEX "idx_recon_items_provider_ref" ON "reconciliation_items" USING btree ("provider_reference");--> statement-breakpoint
CREATE INDEX "idx_recon_items_status" ON "reconciliation_items" USING btree ("status");