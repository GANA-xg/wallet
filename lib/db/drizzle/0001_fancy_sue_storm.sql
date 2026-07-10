CREATE TYPE "public"."account_type" AS ENUM('USER_AVAILABLE', 'USER_RESERVED', 'MERCHANT', 'PLATFORM', 'REWARD', 'FEE', 'ESCROW', 'SETTLEMENT', 'BANK_CLEARING', 'SUSPENSE');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_status" AS ENUM('pending', 'settled', 'failed', 'reversed');--> statement-breakpoint
CREATE TYPE "public"."ledger_entry_type" AS ENUM('debit', 'credit');--> statement-breakpoint
CREATE TYPE "public"."wallet_status" AS ENUM('active', 'inactive', 'frozen', 'closed');--> statement-breakpoint
CREATE TABLE "account_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "account_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"status" "wallet_status" DEFAULT 'active' NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"cached_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"available_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"reserved_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"pending_balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"account_type_id" uuid NOT NULL,
	"label" varchar(255),
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"balance" numeric(15, 2) DEFAULT '0' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_balance_check" CHECK ("balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"entry_type" "ledger_entry_type" NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"currency_code" char(3) DEFAULT 'INR' NOT NULL,
	"balance_before" numeric(15, 2) NOT NULL,
	"balance_after" numeric(15, 2) NOT NULL,
	"exchange_rate" numeric(10, 6),
	CONSTRAINT "ledger_entries_amount_check" CHECK ("amount" > 0),
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid NOT NULL,
	"reversal_entry_id" uuid,
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"account_number_last4" varchar(4) NOT NULL,
	"bank_name" varchar(255) NOT NULL,
	"ifsc_code" varchar(20),
	"upi_id" varchar(255),
	"is_verified" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_account_type_id_account_types_id_fk" FOREIGN KEY ("account_type_id") REFERENCES "public"."account_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settlement_accounts" ADD CONSTRAINT "settlement_accounts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wallets_entity" ON "wallets" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_wallets_status" ON "wallets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_accounts_wallet_type" ON "accounts" USING btree ("wallet_id","account_type_id");--> statement-breakpoint
CREATE INDEX "idx_accounts_active" ON "accounts" USING btree ("wallet_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_accounts_balance" ON "accounts" USING btree ("balance");--> statement-breakpoint
CREATE INDEX "idx_ledger_account" ON "ledger_entries" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_reference" ON "ledger_entries" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_reversal" ON "ledger_entries" USING btree ("reversal_entry_id");--> statement-breakpoint
CREATE INDEX "idx_ledger_created" ON "ledger_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_settlement_account" ON "settlement_accounts" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_verified" ON "settlement_accounts" USING btree ("is_verified");
--> statement-breakpoint
-- Append-only ledger: prevent UPDATE and DELETE on ledger_entries
CREATE OR REPLACE FUNCTION fn_prevent_ledger_mutations()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only: UPDATE and DELETE are not permitted. Use reversing entries for corrections.';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER trg_ledger_entries_immutable
  BEFORE UPDATE OR DELETE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION fn_prevent_ledger_mutations();