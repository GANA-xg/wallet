import { z } from "zod";

const documentTypeEnum = z.enum(["aadhaar", "pan", "driving_license", "passport", "vehicle_rc"]);
const allowedContentTypeEnum = z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export const createDocumentSchema = z.object({
  type: documentTypeEnum,
  encrypted_number: z.string().min(1, "encrypted_number is required"),
  file_url: z.string().min(1, "file_url is required"),
  expiry_date: z.string().optional(),
});

export const uploadUrlSchema = z.object({
  document_type: documentTypeEnum,
  content_type: allowedContentTypeEnum,
});

export const documentIdParamSchema = z.object({
  id: z.string().uuid("Invalid document ID"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;
