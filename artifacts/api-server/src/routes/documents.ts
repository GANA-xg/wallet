import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "node:crypto";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createDocumentSchema,
  documentIdParamSchema,
  uploadUrlSchema,
} from "@workspace/api-zod";
import { getPresignedUploadUrl, deleteS3Object } from "../lib/s3";

const S3_KEY_PATTERN = /^documents\/[0-9a-f-]+\/[a-z_]+\/[0-9a-f-]+\.(jpg|png|webp|pdf)$/;

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const router: IRouter = Router();
router.use(requireAuth);

// POST /documents/upload-url — must be before /documents/:id
router.post(
  "/documents/upload-url",
  validate({ schema: uploadUrlSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { document_type, content_type } = req.body;
      const ext = CONTENT_TYPE_EXT[content_type];
      const uuid = crypto.randomUUID();
      const objectKey = `documents/${userId}/${document_type}/${uuid}.${ext}`;

      const uploadUrl = await getPresignedUploadUrl(objectKey, content_type, 300);

      res.json({
        upload_url: uploadUrl,
        object_key: objectKey,
        expires_in: 300,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to generate upload URL");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /documents
router.get("/documents", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const documents = await db
      .select({
        id: schema.documents.id,
        type: schema.documents.type,
        fileUrl: schema.documents.fileUrl,
        expiryDate: schema.documents.expiryDate,
        createdAt: schema.documents.createdAt,
      })
      .from(schema.documents)
      .where(
        and(
          eq(schema.documents.userId, userId),
          isNull(schema.documents.deletedAt),
        ),
      );

    res.json({ documents });
  } catch (error) {
    logger.error({ err: error }, "Failed to list documents");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /documents/:id
router.get(
  "/documents/:id",
  validate({ schema: documentIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const deviceId = req.user!.deviceId;
      const id = req.params.id as string;

      const document = await db.query.documents.findFirst({
        where: and(
          eq(schema.documents.id, id),
          eq(schema.documents.userId, userId),
          isNull(schema.documents.deletedAt),
        ),
      });

      if (!document) {
        res.status(404).json({ error: "Document not found" });
        return;
      }

      // Audit log: document viewed
      await db.insert(schema.auditLogs).values({
        userId,
        deviceId,
        action: "document.viewed",
        ipAddress: req.ip ?? null,
        metadata: { doc_id: id, type: document.type },
        createdAt: new Date(),
      });

      res.json({ document });
    } catch (error) {
      logger.error({ err: error }, "Failed to get document");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /documents
router.post(
  "/documents",
  validate({ schema: createDocumentSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const deviceId = req.user!.deviceId;
      const { type, encrypted_number, file_url, expiry_date } = req.body;

      // Validate file_url is a known S3 key pattern
      if (!S3_KEY_PATTERN.test(file_url)) {
        res.status(400).json({
          error: "invalid_file_url",
          message: "file_url must be an S3 object key from POST /documents/upload-url",
        });
        return;
      }

      const now = new Date();
      const [document] = await db
        .insert(schema.documents)
        .values({
          userId,
          type,
          encryptedNumber: encrypted_number,
          fileUrl: file_url,
          expiryDate: expiry_date ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Audit log: document created
      await db.insert(schema.auditLogs).values({
        userId,
        deviceId,
        action: "document.created",
        ipAddress: req.ip ?? null,
        metadata: { doc_id: document.id, type },
        createdAt: now,
      });

      // Return without encrypted_number
      const { encryptedNumber: _, ...safeDoc } = document;
      res.status(201).json({ document: safeDoc });
    } catch (error) {
      logger.error({ err: error }, "Failed to create document");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /documents/:id
router.delete(
  "/documents/:id",
  validate({ schema: documentIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const deviceId = req.user!.deviceId;
      const id = req.params.id as string;

      const existing = await db.query.documents.findFirst({
        where: and(
          eq(schema.documents.id, id),
          eq(schema.documents.userId, userId),
          isNull(schema.documents.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Document not found" });
        return;
      }

      await db
        .update(schema.documents)
        .set({ deletedAt: new Date() })
        .where(eq(schema.documents.id, id));

      // Audit log: document deleted
      await db.insert(schema.auditLogs).values({
        userId,
        deviceId,
        action: "document.deleted",
        ipAddress: req.ip ?? null,
        metadata: { doc_id: id, type: existing.type },
        createdAt: new Date(),
      });

      // Best-effort S3 cleanup — never fail the HTTP response
      try {
        await deleteS3Object(existing.fileUrl);
        logger.info({ key: existing.fileUrl }, "Deleted S3 object for document");
      } catch (s3Err) {
        logger.error({ err: s3Err, key: existing.fileUrl }, "Failed to delete S3 object (non-fatal)");
      }

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete document");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
