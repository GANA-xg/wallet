import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, sql, desc } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  subscriptionsQuerySchema,
  updateSubscriptionStatusSchema,
  subscriptionIdParamSchema,
} from "@workspace/api-zod";
import { runSubscriptionDetection } from "../jobs/detectSubscriptions";

const router: IRouter = Router();
router.use(requireAuth);

// GET /subscriptions
router.get(
  "/subscriptions",
  validate({ schema: subscriptionsQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { status, cadence } = req.query as any;

      const conditions: any[] = [eq(schema.subscriptions.userId, userId)];

      if (status && status !== "all") {
        conditions.push(eq(schema.subscriptions.status, status));
      } else if (status !== "all") {
        conditions.push(isNull(schema.subscriptions.deletedAt));
      }

      if (cadence) {
        conditions.push(eq(schema.subscriptions.cadence, cadence));
      }

      const subscriptions = await db
        .select()
        .from(schema.subscriptions)
        .where(and(...conditions));

      // Batch compute next_charge_date — single DB query instead of N
      let recentTxns: (typeof schema.transactions.$inferSelect)[] = [];
      if (subscriptions.length > 0) {
        // Build parameterized ILIKE conditions
        const ilikeConditions = subscriptions.map(
          (_, i) => sql`${schema.transactions.merchant} ILIKE ${`%${subscriptions[i].merchant}%`}`
        );
        recentTxns = await db
          .select()
          .from(schema.transactions)
          .where(
            and(
              eq(schema.transactions.userId, userId),
              isNull(schema.transactions.deletedAt),
              sql`(${ilikeConditions.reduce((a, c) => sql`${a} OR ${c}`)})`
            )
          )
          .orderBy(desc(schema.transactions.occurredAt));
      }

      // Index by merchant match (first/latest match wins)
      const txnByMerchant = new Map<string, typeof schema.transactions.$inferSelect>();
      for (const txn of recentTxns) {
        if (!txnByMerchant.has(txn.merchant ?? "")) {
          txnByMerchant.set(txn.merchant ?? "", txn);
        }
      }

      const subscriptionsWithDates = subscriptions.map((sub) => {
        const matchedTxn = recentTxns.find(
          (t) => t.merchant?.toLowerCase().includes(sub.merchant)
        );
        const baseDate = matchedTxn
          ? new Date(matchedTxn.occurredAt)
          : new Date(sub.createdAt);

        const nextChargeDate = new Date(baseDate);
        if (sub.cadence === "monthly") {
          nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
        } else {
          nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
        }

        return {
          ...sub,
          next_charge_date: nextChargeDate.toISOString(),
        };
      });

      // Compute totals
      const activeMonthly = subscriptions.filter(
        (s) => s.status === "active" && s.cadence === "monthly"
      );
      const activeYearly = subscriptions.filter(
        (s) => s.status === "active" && s.cadence === "yearly"
      );

      const monthly_total_paise = activeMonthly.reduce(
        (sum, s) => sum + s.amountPaise,
        0
      );
      const yearly_total_paise = activeYearly.reduce(
        (sum, s) => sum + s.amountPaise,
        0
      );

      res.json({
        subscriptions: subscriptionsWithDates,
        monthly_total_paise,
        yearly_total_paise,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to list subscriptions");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// POST /subscriptions/detect — must be before :id routes
router.post("/subscriptions/detect", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await runSubscriptionDetection(userId);

    res.json({
      ...result,
      message: "Detection complete",
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to run subscription detection");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /subscriptions/:id/status
router.patch(
  "/subscriptions/:id/status",
  validate({ schema: subscriptionIdParamSchema, source: "params" }, { schema: updateSubscriptionStatusSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const subscriptionId = req.params.id as string;
      const { status } = req.body;

      const existing = await db.query.subscriptions.findFirst({
        where: and(
          eq(schema.subscriptions.id, subscriptionId),
          eq(schema.subscriptions.userId, userId),
          isNull(schema.subscriptions.deletedAt)
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      const [updated] = await db
        .update(schema.subscriptions)
        .set({ status, updatedAt: new Date() })
        .where(eq(schema.subscriptions.id, subscriptionId))
        .returning();

      res.json({ subscription: updated });
    } catch (error) {
      logger.error({ err: error }, "Failed to update subscription status");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

// DELETE /subscriptions/:id
router.delete(
  "/subscriptions/:id",
  validate({ schema: subscriptionIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const subscriptionId = req.params.id as string;

      const existing = await db.query.subscriptions.findFirst({
        where: and(
          eq(schema.subscriptions.id, subscriptionId),
          eq(schema.subscriptions.userId, userId),
          isNull(schema.subscriptions.deletedAt)
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Subscription not found" });
        return;
      }

      await db
        .update(schema.subscriptions)
        .set({ deletedAt: new Date() })
        .where(eq(schema.subscriptions.id, subscriptionId));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete subscription");
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
