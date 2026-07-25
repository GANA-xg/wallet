import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, sql, gte, lte } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  createBudgetSchema,
  updateBudgetSchema,
  budgetIdParamSchema,
  budgetsQuerySchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

// GET /budgets
router.get(
  "/budgets",
  validate({ schema: budgetsQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { month } = req.query as any;
      const targetMonth = month || getCurrentMonth();

      const budgetList = await db.query.budgets.findMany({
        where: and(
          eq(schema.budgets.userId, userId),
          eq(schema.budgets.month, targetMonth),
          isNull(schema.budgets.deletedAt),
        ),
      });

      // Compute spent_paise for each budget
      const budgetsWithSpent = await Promise.all(
        budgetList.map(async (budget) => {
          // Parse month to get start/end dates
          const [year, monthNum] = budget.month.split("-");
          const startDate = new Date(`${year}-${monthNum}-01T00:00:00Z`);
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + 1);

          const [spentResult] = await db
            .select({
              spent: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
            })
            .from(schema.transactions)
            .where(
              and(
                eq(schema.transactions.userId, userId),
                eq(schema.transactions.type, "debit"),
                eq(schema.transactions.category, budget.category),
                gte(schema.transactions.occurredAt, startDate),
                lte(schema.transactions.occurredAt, endDate),
                isNull(schema.transactions.deletedAt),
              ),
            );

          const spentPaise = spentResult?.spent ?? 0;
          const remainingPaise = budget.limitPaise - spentPaise;

          return {
            ...budget,
            spent_paise: spentPaise,
            remaining_paise: remainingPaise,
          };
        }),
      );

      res.json({ budgets: budgetsWithSpent });
    } catch (error) {
      logger.error({ err: error }, "Failed to list budgets");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// POST /budgets
router.post(
  "/budgets",
  validate({ schema: createBudgetSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { category, limit_paise, month } = req.body;
      const targetMonth = month || getCurrentMonth();

      // Check for duplicate category+month
      const existing = await db.query.budgets.findFirst({
        where: and(
          eq(schema.budgets.userId, userId),
          eq(schema.budgets.category, category),
          eq(schema.budgets.month, targetMonth),
          isNull(schema.budgets.deletedAt),
        ),
      });

      if (existing) {
        res.status(409).json({ error: "Budget already exists for this category and month" });
        return;
      }

      const now = new Date();

      const [budget] = await db
        .insert(schema.budgets)
        .values({
          userId,
          category,
          limitPaise: limit_paise,
          month: targetMonth,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      res.status(201).json({ budget });
    } catch (error) {
      logger.error({ err: error }, "Failed to create budget");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// PATCH /budgets/:id
router.patch(
  "/budgets/:id",
  validate({ schema: budgetIdParamSchema, source: "params" }, { schema: updateBudgetSchema, source: "body" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const budgetId = req.params.id as string;
      const { limit_paise } = req.body;

      const existing = await db.query.budgets.findFirst({
        where: and(
          eq(schema.budgets.id, budgetId),
          eq(schema.budgets.userId, userId),
          isNull(schema.budgets.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }

      const [updated] = await db
        .update(schema.budgets)
        .set({ limitPaise: limit_paise, updatedAt: new Date() })
        .where(eq(schema.budgets.id, budgetId))
        .returning();

      res.json({ budget: updated });
    } catch (error) {
      logger.error({ err: error }, "Failed to update budget");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// DELETE /budgets/:id
router.delete(
  "/budgets/:id",
  validate({ schema: budgetIdParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const budgetId = req.params.id as string;

      const existing = await db.query.budgets.findFirst({
        where: and(
          eq(schema.budgets.id, budgetId),
          eq(schema.budgets.userId, userId),
          isNull(schema.budgets.deletedAt),
        ),
      });

      if (!existing) {
        res.status(404).json({ error: "Budget not found" });
        return;
      }

      await db
        .update(schema.budgets)
        .set({ deletedAt: new Date() })
        .where(eq(schema.budgets.id, budgetId));

      res.json({ success: true });
    } catch (error) {
      logger.error({ err: error }, "Failed to delete budget");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
