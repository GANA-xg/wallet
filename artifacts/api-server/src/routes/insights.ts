import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, gte, sql, ilike, desc } from "drizzle-orm";
import { generateInsights } from "../services/ai";
import type { InsightsRequest } from "../services/ai";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import { insightsRequestSchema, forecastQuerySchema, merchantParamSchema } from "@workspace/api-zod";
import { requireAuth } from "../middleware/auth";
import { computeSafeToSpend } from "../lib/safeToSpend";
import { buildCashFlowForecast } from "../lib/cashFlowForecast";
import { getDb, schema } from "@workspace/db";

const router: IRouter = Router();

// ---- Existing AI-powered endpoints (no auth required) ----

router.get("/insights/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", provider: process.env.AI_PROVIDER ?? "local" });
});

router.post(
  "/insights/generate",
  validate({ schema: insightsRequestSchema, source: "body" }),
  async (req, res) => {
    try {
      const body = req.body as InsightsRequest;

      if (body.transactions.length === 0) {
        const emptyInsights = {
          healthScore: 0,
          healthLabel: "No Data",
          month: body.month ?? "",
          year: body.year ?? new Date().getFullYear(),
          spendingSummary: {
            totalIncome: 0, totalSpent: 0, incomeCount: 0, expenseCount: 0,
            averageDailySpend: 0, largestExpense: null, largestIncome: null,
            byCategory: {}, topCategory: null, topCategoryAmount: 0,
          },
          budgetRecommendations: [],
          savingsOpportunities: [],
          unusualTransactions: [],
          subscriptions: [],
          cashFlowForecast: {
            currentBalance: body.balance, projectedBalance: body.balance,
            upcomingExpenses: [], daysUntilDepletion: null, surplus: 0, confidence: "low",
          },
          monthlyTrends: [],
          recommendations: [],
          generatedAt: new Date().toISOString(),
          provider: "local",
        };
        res.json(emptyInsights);
        return;
      }

      const insights = await generateInsights({
        transactions: body.transactions,
        budgets: body.budgets ?? [],
        reservedAmounts: body.reservedAmounts ?? [],
        balance: body.balance,
        upiLite: body.upiLite,
        month: body.month,
        year: body.year,
      });

      res.json(insights);
    } catch (error) {
      logger.error({ err: error }, "Failed to generate insights");
      res.status(500).json({ error: "Failed to generate insights" });
    }
  },
);

// ---- New analytics endpoints (auth required) ----

// GET /insights/safe-to-spend
router.get("/insights/safe-to-spend", requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const result = await computeSafeToSpend(userId);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Failed to compute safe-to-spend");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /insights/forecast
router.get(
  "/insights/forecast",
  requireAuth,
  validate({ schema: forecastQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const { days } = req.query as any;
      const result = await buildCashFlowForecast(userId, days || 30);
      res.json(result);
    } catch (error) {
      logger.error({ err: error }, "Failed to build cash flow forecast");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /insights/cashflow-summary
router.get("/insights/cashflow-summary", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const rows = await db
      .select({
        month: sql<string>`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`,
        type: schema.transactions.type,
        total: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          gte(schema.transactions.occurredAt, sixMonthsAgo),
          isNull(schema.transactions.deletedAt)
        )
      )
      .groupBy(
        sql`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`,
        schema.transactions.type
      )
      .orderBy(sql`to_char(${schema.transactions.occurredAt}, 'YYYY-MM') DESC`);

    // Pivot into months
    const monthMap = new Map<string, { income_paise: number; expenses_paise: number }>();

    for (const row of rows) {
      const entry = monthMap.get(row.month) || { income_paise: 0, expenses_paise: 0 };
      if (row.type === "credit") {
        entry.income_paise = row.total;
      } else if (row.type === "debit") {
        entry.expenses_paise = row.total;
      }
      monthMap.set(row.month, entry);
    }

    const months = Array.from(monthMap.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, data]) => ({
        month,
        income_paise: data.income_paise,
        expenses_paise: data.expenses_paise,
        net_paise: data.income_paise - data.expenses_paise,
      }));

    res.json({ months });
  } catch (error) {
    logger.error({ err: error }, "Failed to get cashflow summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /insights/merchant/:merchantName
router.get(
  "/insights/merchant/:merchantName",
  requireAuth,
  validate({ schema: merchantParamSchema, source: "params" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const merchantName = req.params.merchantName as string;

      const conditions = [
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "debit"),
        ilike(schema.transactions.merchant, `%${merchantName}%`),
        isNull(schema.transactions.deletedAt),
      ];

      // Monthly breakdown
      const monthly = await db
        .select({
          month: sql<string>`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`,
          total_paise: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(schema.transactions)
        .where(and(...conditions))
        .groupBy(sql`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`)
        .orderBy(sql`to_char(${schema.transactions.occurredAt}, 'YYYY-MM') DESC`);

      // Total all time
      const totalAllTime = monthly.reduce((sum, m) => sum + m.total_paise, 0);

      // Current month and last month
      const currentMonth = new Date().toISOString().slice(0, 7);
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const lastMonthStr = lastMonth.toISOString().slice(0, 7);

      const thisMonth = monthly.find((m) => m.month === currentMonth);
      const prevMonth = monthly.find((m) => m.month === lastMonthStr);

      // Last 10 transactions
      const recentTxns = await db
        .select()
        .from(schema.transactions)
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.occurredAt))
        .limit(10);

      res.json({
        merchant: merchantName,
        total_all_time_paise: totalAllTime,
        total_this_month_paise: thisMonth?.total_paise ?? 0,
        total_last_month_paise: prevMonth?.total_paise ?? 0,
        monthly_breakdown: monthly,
        transactions: recentTxns,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to get merchant spending");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /insights/top-categories
router.get("/insights/top-categories", requireAuth, async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const categoryTotals = await db
      .select({
        category: schema.transactions.category,
        total_paise: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
        count: sql<number>`count(*)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          eq(schema.transactions.type, "debit"),
          gte(schema.transactions.occurredAt, thirtyDaysAgo),
          isNull(schema.transactions.deletedAt)
        )
      )
      .groupBy(schema.transactions.category)
      .orderBy(sql`coalesce(sum(${schema.transactions.amountPaise}), 0) DESC`);

    const grandTotal = categoryTotals.reduce((sum, c) => sum + c.total_paise, 0);

    const categories = categoryTotals.map((c) => ({
      category: c.category,
      total_paise: c.total_paise,
      count: c.count,
      percentage: grandTotal > 0
        ? Math.round((c.total_paise / grandTotal) * 1000) / 10
        : 0,
    }));

    res.json({ categories });
  } catch (error) {
    logger.error({ err: error }, "Failed to get top categories");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
