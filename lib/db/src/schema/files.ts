import {
  bigint,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import {
  storageProvider,
  checksumAlgorithm,
  encryptionAlgorithm,
  antivirusStatus,
} from "./enums";

export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storageProvider: storageProvider("storage_provider").notNull(),
    storageBucket: varchar("storage_bucket", { length: 255 }).notNull(),
    storagePath: varchar("storage_path", { length: 1024 }).notNull(),
    objectKey: varchar("object_key", { length: 1024 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    fileSize: bigint("file_size", { mode: "number" }).notNull(),
    checksum: varchar("checksum", { length: 128 }),
    checksumAlgorithm: checksumAlgorithm("checksum_algorithm"),
    contentHash: varchar("content_hash", { length: 128 }),
    encryptionAlgorithm: encryptionAlgorithm("encryption_algorithm"),
    encryptionKeyVersion: varchar("encryption_key_version", { length: 255 }),
    antivirusStatus: antivirusStatus("antivirus_status")
      .notNull()
      .default("PENDING"),
    antivirusScannedAt: timestamp("antivirus_scanned_at", {
      withTimezone: true,
    }),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    providerIdx: index("idx_files_provider").on(table.storageProvider),
    bucketIdx: index("idx_files_bucket").on(table.storageBucket),
    checksumIdx: index("idx_files_checksum").on(table.checksum),
    contentHashIdx: index("idx_files_content_hash").on(table.contentHash),
    antivirusIdx: index("idx_files_antivirus").on(table.antivirusStatus),
    uploadedAtIdx: index("idx_files_uploaded").on(table.uploadedAt),
  }),
);

export const insertFileSchema = createInsertSchema(files, {
  storageProvider: z.enum(["LOCAL", "AWS_S3", "GCS", "AZURE_BLOB"]),
  storageBucket: z.string().min(1).max(255),
  storagePath: z.string().min(1).max(1024),
  objectKey: z.string().min(1).max(1024),
  mimeType: z.string().min(1).max(100),
  fileSize: z.number().int().min(0),
  checksum: z.string().max(128).nullable().optional(),
  checksumAlgorithm: z
    .enum(["SHA256", "SHA512", "MD5"])
    .nullable()
    .optional(),
  contentHash: z.string().max(128).nullable().optional(),
  encryptionAlgorithm: z
    .enum(["AES256_GCM", "AES256_CBC"])
    .nullable()
    .optional(),
  encryptionKeyVersion: z.string().max(255).nullable().optional(),
  antivirusStatus: z
    .enum(["PENDING", "SCANNING", "CLEAN", "INFECTED", "ERROR"])
    .default("PENDING"),
  antivirusScannedAt: z.string().datetime().nullable().optional(),
  uploadedAt: z.string().datetime().optional(),
});

export const selectFileSchema = createSelectSchema(files);

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;
