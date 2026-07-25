import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createPassSchema,
  topupPassSchema,
  passIdParamSchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

// GET /transport/passes
router.get("/transport/passes", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const passes = await db.query.transportPasses.findMany({
      where: and(
        eq(schema.transportPasses.userId, userId),
        isNull(schema.transportPasses.deletedAt),
      ),
    });

    res.json({ passes });
  } catch (error) {
    logger.error({ err: error }, "Failed to list transport passes");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /transport/passes/:id
router.get(
  "/transport/passes/:id",
  validate({ schema: passIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const passId = req.params.id as string;

      const pass = await db.query.transportPasses.findFirst({
        where: and(
          eq(schema.transportPasses.id, passId),
          eq(schema.transportPasses.userId, userId),
          isNull(schema.transportPasses.deletedAt),
        ),
      });

      if (!pass) {
        res.status(404).json({ error: "Transport pass not found" });
        return;
      }

      res.json({ pass });
    } catch (error) {
      logger.error({ err: error }, "Failed to get transport pass");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /transport/passes
router.post(
  "/transport/passes",
  validate({ schema: createPassSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { type, card_number, balance_paise, city, expires_at } = req.body;

      // Validate expires_at is in the future
      const expiryDate = new Date(expires_at);
      if (expiryDate <= new Date()) {
        res.status(400).json({ error: "expires_at must be in the future" });
        return;
      }

      const now = new Date();

      const [pass] = await db
        .insert(schema.transportPasses)
        .values({
          userId,
          type,
          cardNumber: card_number,
          balancePaise: balance_paise,
          city,
          expiresAt: expires_at,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ pass });
    } catch (error) {
      logger.error({ err: error }, "Failed to create transport pass");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /transport/passes/:id/topup
router.post(
  "/transport/passes/:id/topup",
  validate({ schema: passIdParamSchema, source: "params" }, { schema: topupPassSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const passId = req.params.id as string;
      const { amount_paise } = req.body;

      const pass = await db.query.transportPasses.findFirst({
        where: and(
          eq(schema.transportPasses.id, passId),
          eq(schema.transportPasses.userId, userId),
          isNull(schema.transportPasses.deletedAt),
        ),
      });

      if (!pass) {
        res.status(404).json({ error: "Transport pass not found" });
        return;
      }

      const result = await db.transaction(async (tx) => {
        const [updatedPass] = await tx
          .update(schema.transportPasses)
          .set({
            balancePaise: pass.balancePaise + amount_paise,
            updatedAt: new Date(),
          })
          .where(eq(schema.transportPasses.id, passId))
          .returning();

        const now = new Date();
        const [transaction] = await tx
          .insert(schema.transactions)
          .values({
            userId,
            amountPaise: amount_paise,
            type: "credit",
            status: "success",
            category: "transport_topup",
            merchant: `${pass.city} Transit`,
            source: "upi_app",
            occurredAt: now,
            createdAt: now,
            updatedAt: now,
          })
          .returning();

        return { pass: updatedPass, transaction };
      });

      res.json(result);
    } catch (error) {
      logger.error({ err: error }, "Failed to topup transport pass");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /transport/passes/:id
router.delete(
  "/transport/passes/:id",
  validate({ schema: passIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const passId = req.params.id as string;

      const existing = await db.query.transportPasses.findFirst({
        where: and(
          eq(schema.transportPasses.id, passId),
          eq(schema.transportPasses.userId, userId),
          isNull(schema.transportPasses.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Transport pass not found" });
        return;
      }

      await db
        .update(schema.transportPasses)
        .set({ deletedAt: new Date() })
        .where(eq(schema.transportPasses.id, passId));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete transport pass");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
