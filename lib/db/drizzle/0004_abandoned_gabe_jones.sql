CREATE TYPE "public"."antivirus_status" AS ENUM('PENDING', 'SCANNING', 'CLEAN', 'INFECTED', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."checksum_algorithm" AS ENUM('SHA256', 'SHA512', 'MD5');--> statement-breakpoint
CREATE TYPE "public"."document_category_code" AS ENUM('AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'ADDRESS_PROOF', 'INCOME_PROOF', 'BANK_STATEMENT', 'RECEIPT', 'BILL', 'TICKET', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('UPLOADED', 'PROCESSING', 'OCR_COMPLETED', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."document_verification_action" AS ENUM('VERIFIED', 'REJECTED', 'REQUESTED_REUPLOAD', 'FLAGGED_FOR_REVIEW');--> statement-breakpoint
CREATE TYPE "public"."encryption_algorithm" AS ENUM('AES256_GCM', 'AES256_CBC');--> statement-breakpoint
CREATE TYPE "public"."ocr_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."storage_provider" AS ENUM('LOCAL', 'AWS_S3', 'GCS', 'AZURE_BLOB');--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"validation_rules" jsonb DEFAULT '{}'::jsonb,
	"retention_days" integer,
	"is_identity" boolean DEFAULT false NOT NULL,
	CONSTRAINT "document_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"status" "document_status" DEFAULT 'UPLOADED' NOT NULL,
	"description" text,
	"expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "document_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"storage_provider" "storage_provider" NOT NULL,
	"storage_bucket" varchar(255) NOT NULL,
	"storage_path" varchar(1024) NOT NULL,
	"object_key" varchar(1024) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size" bigint NOT NULL,
	"checksum" varchar(128),
	"checksum_algorithm" "checksum_algorithm",
	"content_hash" varchar(128),
	"encryption_algorithm" "encryption_algorithm",
	"encryption_key_version" varchar(255),
	"antivirus_status" "antivirus_status" DEFAULT 'PENDING' NOT NULL,
	"antivirus_scanned_at" timestamp with time zone,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"file_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_verification_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" "document_verification_action" NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_ocr_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"extracted_text" text,
	"extracted_fields" jsonb,
	"confidence" numeric(5, 2),
	"ocr_provider" varchar(100),
	"ocr_model_version" varchar(50),
	"processing_time_ms" integer,
	"ocr_status" "ocr_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_version_id" uuid NOT NULL,
	"classification" varchar(100),
	"classification_confidence" numeric(5, 2),
	"summary" text,
	"fraud_risk_score" numeric(5, 2),
	"fraud_indicators" jsonb,
	"verification_suggestions" jsonb,
	"ai_provider" varchar(100),
	"ai_model_version" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_versions" ADD CONSTRAINT "document_versions_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_file_id_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."files"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_verification_history" ADD CONSTRAINT "document_verification_history_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_verification_history" ADD CONSTRAINT "document_verification_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_ocr_results" ADD CONSTRAINT "document_ocr_results_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_ai_insights" ADD CONSTRAINT "document_ai_insights_document_version_id_document_versions_id_fk" FOREIGN KEY ("document_version_id") REFERENCES "public"."document_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_documents_user" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_documents_category" ON "documents" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_documents_status" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_documents_expiry" ON "documents" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_documents_upload" ON "documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_documents_user_status" ON "documents" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_document" ON "document_versions" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_doc_versions_number" ON "document_versions" USING btree ("document_id","version_number");--> statement-breakpoint
CREATE INDEX "idx_files_provider" ON "files" USING btree ("storage_provider");--> statement-breakpoint
CREATE INDEX "idx_files_bucket" ON "files" USING btree ("storage_bucket");--> statement-breakpoint
CREATE INDEX "idx_files_checksum" ON "files" USING btree ("checksum");--> statement-breakpoint
CREATE INDEX "idx_files_content_hash" ON "files" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_files_antivirus" ON "files" USING btree ("antivirus_status");--> statement-breakpoint
CREATE INDEX "idx_files_uploaded" ON "files" USING btree ("uploaded_at");--> statement-breakpoint
CREATE INDEX "idx_doc_files_version" ON "document_files" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "idx_doc_files_file" ON "document_files" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_doc_files_primary" ON "document_files" USING btree ("document_version_id","is_primary");--> statement-breakpoint
CREATE INDEX "idx_doc_verification_document" ON "document_verification_history" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_doc_verification_user" ON "document_verification_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_doc_verification_action" ON "document_verification_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_doc_verification_created" ON "document_verification_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_doc_ocr_version" ON "document_ocr_results" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "idx_doc_ocr_status" ON "document_ocr_results" USING btree ("ocr_status");--> statement-breakpoint
CREATE INDEX "idx_doc_ocr_created" ON "document_ocr_results" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_doc_ai_version" ON "document_ai_insights" USING btree ("document_version_id");--> statement-breakpoint
CREATE INDEX "idx_doc_ai_classification" ON "document_ai_insights" USING btree ("classification");--> statement-breakpoint
CREATE INDEX "idx_doc_ai_fraud_score" ON "document_ai_insights" USING btree ("fraud_risk_score");--> statement-breakpoint
CREATE INDEX "idx_doc_ai_created" ON "document_ai_insights" USING btree ("created_at");