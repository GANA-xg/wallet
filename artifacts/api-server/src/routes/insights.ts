import { Router, type IRouter } from "express";
import { generateInsights } from "../services/ai";
import type { InsightsRequest } from "../services/ai";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import { insightsRequestSchema } from "@workspace/api-zod";

const router: IRouter = Router();

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

export default router;
