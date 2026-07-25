import { eq, and, isNull, gte, sql, ilike, desc as drizzleDesc } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";

export type CashFlowEvent = {
  date: string;
  label: string;
  amount_paise: number;
  direction: "in" | "out";
  source: "subscription" | "reserved" | "estimated_income";
  confidence: "confirmed" | "estimated";
};

export type CashFlowForecast = {
  period_days: number;
  projected_income_paise: number;
  projected_expenses_paise: number;
  net_paise: number;
  timeline: CashFlowEvent[];
};

async function estimateMonthlyIncome(userId: string): Promise<number> {
  const db = getDb();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const credits = await db
    .select({
      month: sql<string>`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`,
      total: sql<number>`coalesce(sum(${schema.transactions.amountPaise}), 0)`,
    })
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "credit"),
        eq(schema.transactions.status, "success"),
        gte(schema.transactions.occurredAt, threeMonthsAgo),
        isNull(schema.transactions.deletedAt)
      )
    )
    .groupBy(sql`to_char(${schema.transactions.occurredAt}, 'YYYY-MM')`);

  // Average across months that had at least 1 credit
  const monthsWithCredits = credits.filter((m) => m.total > 0);
  if (monthsWithCredits.length === 0) return 0;

  const totalIncome = monthsWithCredits.reduce((sum, m) => sum + m.total, 0);
  return Math.round(totalIncome / monthsWithCredits.length);
}

async function getNextSubscriptionChargeDate(
  userId: string,
  merchant: string,
  cadence: "monthly" | "yearly",
  createdAt: Date
): Promise<Date | null> {
  const db = getDb();

  const recentTxn = await db.query.transactions.findFirst({
    where: and(
      eq(schema.transactions.userId, userId),
      ilike(schema.transactions.merchant, `%${merchant}%`),
      isNull(schema.transactions.deletedAt)
    ),
    orderBy: (t, { desc }) => [desc(t.occurredAt)],
  });

  const baseDate = recentTxn
    ? new Date(recentTxn.occurredAt)
    : new Date(createdAt);

  const nextCharge = new Date(baseDate);
  if (cadence === "monthly") {
    nextCharge.setMonth(nextCharge.getMonth() + 1);
  } else {
    nextCharge.setFullYear(nextCharge.getFullYear() + 1);
  }

  return nextCharge;
}

export async function buildCashFlowForecast(
  userId: string,
  days: number
): Promise<CashFlowForecast> {
  const db = getDb();
  const now = new Date();
  const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const timeline: CashFlowEvent[] = [];

  // Income estimation
  const avgMonthlyIncome = await estimateMonthlyIncome(userId);
  if (avgMonthlyIncome > 0) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dateStr = nextMonth.toISOString().split("T")[0];

    timeline.push({
      date: dateStr,
      label: "Estimated Income",
      amount_paise: avgMonthlyIncome,
      direction: "in",
      source: "estimated_income",
      confidence: "estimated",
    });
  }

  // Subscription events
  const activeSubs = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.status, "active"),
        isNull(schema.subscriptions.deletedAt)
      )
    );

  for (const sub of activeSubs) {
    const nextCharge = await getNextSubscriptionChargeDate(
      userId,
      sub.merchant,
      sub.cadence,
      new Date(sub.createdAt)
    );

    if (nextCharge && nextCharge >= now && nextCharge <= endDate) {
      const dateStr = nextCharge.toISOString().split("T")[0];
      timeline.push({
        date: dateStr,
        label: `${sub.merchant} · ${sub.cadence === "monthly" ? "Monthly" : "Yearly"}`,
        amount_paise: sub.amountPaise,
        direction: "out",
        source: "subscription",
        confidence: "confirmed",
      });
    }
  }

  // Reserved amount events
  const reserves = await db.query.reservedAmounts.findMany({
    where: and(
      eq(schema.reservedAmounts.userId, userId),
      isNull(schema.reservedAmounts.deletedAt)
    ),
  });

  for (const reserve of reserves) {
    const dueDate = new Date(reserve.dueDate);

    if (dueDate >= now && dueDate <= endDate) {
      const dateStr = dueDate.toISOString().split("T")[0];
      timeline.push({
        date: dateStr,
        label: reserve.label,
        amount_paise: reserve.amountPaise,
        direction: "out",
        source: "reserved",
        confidence: "confirmed",
      });
    }

    // If recurring and due date is in the past, project forward
    if (reserve.isRecurring && reserve.interval && dueDate < now) {
      let projectedDate = new Date(dueDate);
      let maxIterations = 12; // safety limit

      while (projectedDate <= endDate && maxIterations > 0) {
        // Add interval
        switch (reserve.interval) {
          case "monthly":
            projectedDate.setMonth(projectedDate.getMonth() + 1);
            break;
          case "weekly":
            projectedDate.setDate(projectedDate.getDate() + 7);
            break;
          case "yearly":
            projectedDate.setFullYear(projectedDate.getFullYear() + 1);
            break;
        }

        if (projectedDate >= now && projectedDate <= endDate) {
          const dateStr = projectedDate.toISOString().split("T")[0];
          timeline.push({
            date: dateStr,
            label: reserve.label,
            amount_paise: reserve.amountPaise,
            direction: "out",
            source: "reserved",
            confidence: "confirmed",
          });
        }

        maxIterations--;
      }
    }
  }

  // Sort timeline by date ASC
  timeline.sort((a, b) => a.date.localeCompare(b.date));

  const projectedExpensesPaise = timeline
    .filter((e) => e.direction === "out")
    .reduce((sum, e) => sum + e.amount_paise, 0);

  const projectedIncomePaise = timeline
    .filter((e) => e.direction === "in")
    .reduce((sum, e) => sum + e.amount_paise, 0);

  return {
    period_days: days,
    projected_income_paise: projectedIncomePaise,
    projected_expenses_paise: projectedExpensesPaise,
    net_paise: projectedIncomePaise - projectedExpensesPaise,
    timeline,
  };
}
