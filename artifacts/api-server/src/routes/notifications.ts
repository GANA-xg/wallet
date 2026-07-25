import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, desc, sql } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  notificationIdParamSchema,
  notificationsQuerySchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

// GET /notifications
router.get(
  "/notifications",
  validate({ schema: notificationsQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { unread_only, type, limit } = req.query as any;

      const conditions = [
        eq(schema.notifications.userId, userId),
        isNull(schema.notifications.deletedAt),
      ];

      if (unread_only === "true") {
        conditions.push(eq(schema.notifications.isRead, false));
      }

      if (type) {
        conditions.push(eq(schema.notifications.type, type));
      }

      const notifications = await db
        .select()
        .from(schema.notifications)
        .where(and(...conditions))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit || 50);

      // Always get total unread count regardless of filters
      const [unreadCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userId, userId),
            eq(schema.notifications.isRead, false),
            isNull(schema.notifications.deletedAt),
          ),
        );

      res.json({
        notifications,
        unread_count: unreadCount?.count ?? 0,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to list notifications");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// PATCH /notifications/read-all (must be before :id route to match correctly)
router.patch("/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const result = await db
      .update(schema.notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(
          eq(schema.notifications.userId, userId),
          eq(schema.notifications.isRead, false),
          isNull(schema.notifications.deletedAt),
        ),
      );

    const updated = result.rowCount ?? 0;

    res.json({ updated_count: updated });
  } catch (error) {
    logger.error({ err: error }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /notifications/:id/read
router.patch(
  "/notifications/:id/read",
  validate({ schema: notificationIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const notificationId = req.params.id as string;

      const existing = await db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      const [updated] = await db
        .update(schema.notifications)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(schema.notifications.id, notificationId))
        .returning();

      res.json({ notification: updated });
    } catch (error) {
      logger.error({ err: error }, "Failed to mark notification as read");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /notifications/:id
router.delete(
  "/notifications/:id",
  validate({ schema: notificationIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const notificationId = req.params.id as string;

      const existing = await db.query.notifications.findFirst({
        where: and(
          eq(schema.notifications.id, notificationId),
          eq(schema.notifications.userId, userId),
          isNull(schema.notifications.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Notification not found" });
        return;
      }

      await db
        .update(schema.notifications)
        .set({ deletedAt: new Date() })
        .where(eq(schema.notifications.id, notificationId));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete notification");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
