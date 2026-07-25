import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, isNull, gte, lte, sql, desc } from "drizzle-orm";
import { Parser } from "json2csv";
import { getDb, schema } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";
import { validate } from "../middlewares/validate";
import {
  spendingBreakdownQuerySchema,
  dailySpendingQuerySchema,
  statementQuerySchema,
} from "@workspace/api-zod";

const router: IRouter = Router();
router.use(requireAuth);

function getPeriodRange(period: string, customFrom?: string, customTo?: string): { from: Date; to: Date } {
  if (customFrom && customTo) {
    return { from: new Date(customFrom), to: new Date(customTo) };
  }

  const now = new Date();
  let from: Date;
  switch (period) {
    case "week":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "quarter":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    default:
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  return { from, to: now };
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// GET /analytics/spending-breakdown
router.get(
  "/analytics/spending-breakdown",
  validate({ schema: spendingBreakdownQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { period, custom_from, custom_to } = req.query as any;

      const { from, to } = getPeriodRange(period, custom_from, custom_to);
      const periodDuration = to.getTime() - from.getTime();
      const lastPeriodTo = new Date(from);
      const lastPeriodFrom = new Date(lastPeriodTo.getTime() - periodDuration);

      const conditions = [
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "debit"),
        gte(schema.transactions.occurredAt, from),
        lte(schema.transactions.occurredAt, to),
        isNull(schema.transactions.deletedAt),
      ];

      const lastPeriodConditions = [
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "debit"),
        gte(schema.transactions.occurredAt, lastPeriodFrom),
        lte(schema.transactions.occurredAt, lastPeriodTo),
        isNull(schema.transactions.deletedAt),
      ];

      // Current period by category
      const categoryData = await db
        .select({
          category: schema.transactions.category,
          total_paise: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(schema.transactions)
        .where(and(...conditions))
        .groupBy(schema.transactions.category)
        .orderBy(sql`coalesce(sum(${schema.transactions.amountPaise}), 0) DESC`);

      // Last period by category
      const lastPeriodData = await db
        .select({
          category: schema.transactions.category,
          total_paise: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
        })
        .from(schema.transactions)
        .where(and(...lastPeriodConditions))
        .groupBy(schema.transactions.category);

      const totalSpent = categoryData.reduce((s, c) => s + c.total_paise, 0);
      const lastPeriodMap = new Map(lastPeriodData.map((d) => [d.category, d.total_paise]));

      const byCategory = categoryData.map((c) => {
        const lastAmount = lastPeriodMap.get(c.category) || 0;
        const diff = c.total_paise - lastAmount;
        const pctChange = lastAmount > 0 ? (diff / lastAmount) * 100 : 100;

        let trend: "up" | "down" | "same";
        if (lastAmount === 0 || Math.abs(pctChange) <= 5) {
          trend = "same";
        } else if (pctChange > 0) {
          trend = "up";
        } else {
          trend = "down";
        }

        return {
          category: c.category,
          total_paise: c.total_paise,
          count: c.count,
          percentage: totalSpent > 0 ? Math.round((c.total_paise / totalSpent) * 1000) / 10 : 0,
          vs_last_period_paise: diff,
          trend,
        };
      });

      res.json({
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
        },
        total_spent_paise: totalSpent,
        by_category: byCategory,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to get spending breakdown");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /analytics/daily-spending
router.get(
  "/analytics/daily-spending",
  validate({ schema: dailySpendingQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { month } = req.query as any;

      const targetMonth = month || new Date().toISOString().slice(0, 7);
      const [yearStr, monthStr] = targetMonth.split("-");
      const year = parseInt(yearStr, 10);
      const monthNum = parseInt(monthStr, 10);
      const daysInMonth = getDaysInMonth(year, monthNum);

      const startDate = new Date(`${targetMonth}-01T00:00:00Z`);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999);

      const dailyData = await db
        .select({
          date: sql<string>`to_char(${schema.transactions.occurredAt}, 'YYYY-MM-DD')`,
          total_paise: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.userId, userId),
            eq(schema.transactions.type, "debit"),
            gte(schema.transactions.occurredAt, startDate),
            lte(schema.transactions.occurredAt, endDate),
            isNull(schema.transactions.deletedAt),
          ),
        )
        .groupBy(sql`to_char(${schema.transactions.occurredAt}, 'YYYY-MM-DD')`);

      const dataMap = new Map(dailyData.map((d) => [d.date, d]));
      const daily: Array<{ date: string; total_paise: number; count: number }> = [];

      let highestDay: { date: string; total_paise: number } = { date: "", total_paise: 0 };
      let grandTotal = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetMonth}-${String(d).padStart(2, "0")}`;
        const entry = dataMap.get(dateStr);
        const totalPaise = entry?.total_paise ?? 0;
        const count = entry?.count ?? 0;

        daily.push({ date: dateStr, total_paise: totalPaise, count });
        grandTotal += totalPaise;

        if (totalPaise > highestDay.total_paise) {
          highestDay = { date: dateStr, total_paise: totalPaise };
        }
      }

      res.json({
        month: targetMonth,
        daily,
        average_daily_paise: Math.round(grandTotal / daysInMonth),
        highest_day: highestDay,
        total_paise: grandTotal,
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to get daily spending");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /analytics/merchant-frequency
router.get("/analytics/merchant-frequency", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const merchants = await db
      .select({
        merchant: schema.transactions.merchant,
        count: sql<number>`count(*)`,
        total_paise: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
      })
      .from(schema.transactions)
      .where(
        and(
          eq(schema.transactions.userId, userId),
          eq(schema.transactions.type, "debit"),
          gte(schema.transactions.occurredAt, thirtyDaysAgo),
          isNull(schema.transactions.deletedAt),
          sql`${schema.transactions.merchant} IS NOT NULL`,
        ),
      )
      .groupBy(schema.transactions.merchant)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    res.json({ merchants });
  } catch (error) {
    logger.error({ err: error }, "Failed to get merchant frequency");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /analytics/statement
router.get(
  "/analytics/statement",
  validate({ schema: statementQuerySchema, source: "query" }),
  async (req: Request, res: Response) => {
    try {
      const db = getDb();
      const userId = req.user!.userId;
      const { from, to, format, type } = req.query as any;

      const fromDate = new Date(from);
      const toDate = new Date(to);

      if (isNaN(fromDate.getTime())) {
        res.status(400).json({ error: "Invalid 'from' date" });
        return;
      }
      if (isNaN(toDate.getTime())) {
        res.status(400).json({ error: "Invalid 'to' date" });
        return;
      }
      if (fromDate >= toDate) {
        res.status(400).json({ error: "'from' must be before 'to'" });
        return;
      }
      const rangeDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
      if (rangeDays > 366) {
        res.status(400).json({ error: "Date range must not exceed 366 days" });
        return;
      }

      const conditions = [
        eq(schema.transactions.userId, userId),
        gte(schema.transactions.occurredAt, fromDate),
        lte(schema.transactions.occurredAt, toDate),
        isNull(schema.transactions.deletedAt),
      ];
      if (type !== "all") {
        conditions.push(eq(schema.transactions.type, type));
      }

      const transactions = await db
        .select()
        .from(schema.transactions)
        .where(and(...conditions))
        .orderBy(desc(schema.transactions.occurredAt));

      if (format === "csv") {
        const fields = [
          { label: "Date", value: (row: typeof schema.transactions.$inferSelect) => {
            const d = new Date(row.occurredAt);
            return d.toISOString().split("T")[0];
          }},
          { label: "Time", value: (row: typeof schema.transactions.$inferSelect) => {
            const d = new Date(row.occurredAt);
            return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
          }},
          { label: "Description", value: "merchant" },
          { label: "Category", value: "category" },
          { label: "Type", value: "type" },
          { label: "Amount (₹)", value: (row: typeof schema.transactions.$inferSelect) => {
            return (row.amountPaise / 100).toFixed(2);
          }},
          { label: "Status", value: "status" },
          { label: "Reference", value: "idempotencyKey" },
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(transactions);

        const fromStr = fromDate.toISOString().split("T")[0];
        const toStr = toDate.toISOString().split("T")[0];

        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="vault-statement-${fromStr}-${toStr}.csv"`,
        );
        res.send(csv);
        return;
      }

      const totals = transactions.reduce(
        (acc, t) => {
          if (t.type === "credit") acc.credit += t.amountPaise;
          if (t.type === "debit") acc.debit += t.amountPaise;
          return acc;
        },
        { credit: 0, debit: 0 },
      );

      res.json({
        statement: {
          from: fromDate.toISOString(),
          to: toDate.toISOString(),
          generated_at: new Date().toISOString(),
          transactions,
          summary: {
            total_credit_paise: totals.credit,
            total_debit_paise: totals.debit,
            net_paise: totals.credit - totals.debit,
            transaction_count: transactions.length,
          },
        },
      });
    } catch (error) {
      logger.error({ err: error }, "Failed to generate statement");
      res.status(500).json({ error: "Internal server error" });
    }
  },
);

// GET /analytics/net-worth
router.get("/analytics/net-worth", async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = req.user!.userId;

    // Assets: wallet balance
    const wallet = await db.query.wallets.findFirst({
      where: eq(schema.wallets.userId, userId),
    });
    const walletPaise = wallet?.balancePaise ?? 0;

    // Assets: transport pass balances
    const [transportResult] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.transportPasses.balancePaise}), 0)` })
      .from(schema.transportPasses)
      .where(
        and(
          eq(schema.transportPasses.userId, userId),
          isNull(schema.transportPasses.deletedAt),
        ),
      );
    const transitPaise = transportResult?.total ?? 0;

    // Liabilities: reserved amounts
    const [reservedResult] = await db
      .select({ total: sql<number>`coalesce(sum(${schema.reservedAmounts.amountPaise}), 0)` })
      .from(schema.reservedAmounts)
      .where(
        and(
          eq(schema.reservedAmounts.userId, userId),
          isNull(schema.reservedAmounts.deletedAt),
        ),
      );
    const reservedPaise = reservedResult?.total ?? 0;

    // Liabilities: annualised subscriptions
    const activeSubs = await db
      .select()
      .from(schema.subscriptions)
      .where(
        and(
          eq(schema.subscriptions.userId, userId),
          eq(schema.subscriptions.status, "active"),
          isNull(schema.subscriptions.deletedAt),
        ),
      );

    const annualisedSubsPaise = activeSubs.reduce((sum, s) => {
      return sum + s.amountPaise * (s.cadence === "monthly" ? 12 : 1);
    }, 0);

    const totalAssets = walletPaise + transitPaise;
    const totalLiabilities = reservedPaise + annualisedSubsPaise;

    res.json({
      assets: {
        wallet_paise: walletPaise,
        transit_passes_paise: transitPaise,
        total_paise: totalAssets,
      },
      liabilities: {
        reserved_obligations_paise: reservedPaise,
        annualised_subscriptions_paise: annualisedSubsPaise,
        total_paise: totalLiabilities,
      },
      net_worth_paise: totalAssets - totalLiabilities,
      computed_at: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to compute net worth");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
