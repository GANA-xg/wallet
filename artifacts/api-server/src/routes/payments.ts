import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, sql } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createReservedSchema,
  reservedIdParamSchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

// GET /payments/reserved
router.get("/payments/reserved", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const reserved = await db.query.reservedAmounts.findMany({
      where: and(
        eq(schema.reservedAmounts.userId, userId),
        isNull(schema.reservedAmounts.deletedAt),
      ),
      orderBy: (rows, { asc }) => [asc(rows.dueDate)],
    });

    const totalReservedPaise = reserved.reduce((sum, r) => sum + r.amountPaise, 0);

    res.json({ reserved, total_reserved_paise: totalReservedPaise });
  } catch (error) {
    logger.error({ err: error }, "Failed to list reserved amounts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /payments/reserved
router.post(
  "/payments/reserved",
  validate({ schema: createReservedSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { label, amount_paise, category, due_date, is_recurring, interval } = req.body;

      const now = new Date();
      const [reserved] = await db
        .insert(schema.reservedAmounts)
        .values({
          userId,
          label,
          amountPaise: amount_paise,
          category,
          dueDate: due_date,
          isRecurring: is_recurring,
          interval: interval ?? null,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ reserved });
    } catch (error) {
      logger.error({ err: error }, "Failed to create reserved amount");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /payments/reserved/:id
router.delete(
  "/payments/reserved/:id",
  validate({ schema: reservedIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const id = req.params.id as string;

      const existing = await db.query.reservedAmounts.findFirst({
        where: and(
          eq(schema.reservedAmounts.id, id),
          eq(schema.reservedAmounts.userId, userId),
          isNull(schema.reservedAmounts.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Reserved amount not found" });
        return;
      }

      await db
        .update(schema.reservedAmounts)
        .set({ deletedAt: new Date() })
        .where(eq(schema.reservedAmounts.id, id));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete reserved amount");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /payments/scheduled
router.get("/payments/scheduled", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcoming = await db
      .select()
      .from(schema.reservedAmounts)
      .where(
        and(
          eq(schema.reservedAmounts.userId, userId),
          isNull(schema.reservedAmounts.deletedAt),
          sql`${schema.reservedAmounts.dueDate} >= ${now}`,
          sql`${schema.reservedAmounts.dueDate} <= ${thirtyDaysFromNow}`,
        ),
      )
      .orderBy(sql`${schema.reservedAmounts.dueDate} ASC`);

    res.json({ upcoming });
  } catch (error) {
    logger.error({ err: error }, "Failed to list scheduled payments");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;