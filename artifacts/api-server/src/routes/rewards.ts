import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, or, gt, type SQL } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createRewardSchema,
  rewardIdParamSchema,
  rewardsQuerySchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

// GET /rewards
router.get(
  "/rewards",
  validate({ schema: rewardsQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { type, active_only } = req.query as any;

const conditions: (SQL<unknown> | undefined)[] = [
        eq(schema.rewards.userId, userId),
        isNull(schema.rewards.deletedAt),
      ];

      if (type) {
        conditions.push(eq(schema.rewards.type, type));
      }

      if (active_only === "true") {
        const now = new Date();
        conditions.push(
          or(
            isNull(schema.rewards.expiresAt),
            gt(schema.rewards.expiresAt, now),
          ),
        );
      }

      const rewards = await db
        .select()
        .from(schema.rewards)
        .where(and(...conditions.filter(Boolean)));

      res.json({ rewards });
    } catch (error) {
      logger.error({ err: error }, "Failed to list rewards");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /rewards/:id
router.get(
  "/rewards/:id",
  validate({ schema: rewardIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const rewardId = req.params.id as string;

      const reward = await db.query.rewards.findFirst({
        where: and(
          eq(schema.rewards.id, rewardId),
          eq(schema.rewards.userId, userId),
          isNull(schema.rewards.deletedAt),
        ),
      });

      if (!reward) {
        res.status(404).json({ error: "Reward not found" });
        return;
      }

      res.json({ reward });
    } catch (error) {
      logger.error({ err: error }, "Failed to get reward");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /rewards
router.post(
  "/rewards",
  validate({ schema: createRewardSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { type, brand, value, code, expires_at } = req.body;

      if (expires_at) {
        const expiryDate = new Date(expires_at);
        if (expiryDate <= new Date()) {
          res.status(400).json({ error: "expires_at must be in the future" });
          return;
        }
      }

      const now = new Date();

      const [reward] = await db
        .insert(schema.rewards)
        .values({
          userId,
          type,
          brand,
          value,
          code: code ?? null,
          expiresAt: expires_at ? new Date(expires_at) : null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ reward });
    } catch (error) {
      logger.error({ err: error }, "Failed to create reward");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /rewards/:id
router.delete(
  "/rewards/:id",
  validate({ schema: rewardIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const rewardId = req.params.id as string;

      const existing = await db.query.rewards.findFirst({
        where: and(
          eq(schema.rewards.id, rewardId),
          eq(schema.rewards.userId, userId),
          isNull(schema.rewards.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Reward not found" });
        return;
      }

      await db
        .update(schema.rewards)
        .set({ deletedAt: new Date() })
        .where(eq(schema.rewards.id, rewardId));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete reward");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
