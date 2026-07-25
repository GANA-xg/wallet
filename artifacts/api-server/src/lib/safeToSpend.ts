import { eq, and, isNull, gte, sql, ilike } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";

export type SafeToSpend = {
  balance_paise: number;
  reserved_paise: number;
  upcoming_subscriptions_paise: number;
  safe_to_spend_paise: number;
  warning: "low_balance" | "insufficient" | null;
};

export async function computeSafeToSpend(userId: string): Promise<SafeToSpend> {
  const db = getDb();

  // Fetch wallet balance
  const wallet = await db.query.wallets.findFirst({
    where: eq(schema.wallets.userId, userId),
  });
  const balancePaise = wallet?.balancePaise ?? 0;

  // Sum reserved amounts
  const [reservedResult] = await db
    .select({ total: sql<number>`coalesce(sum(${schema.reservedAmounts.amountPaise}), 0)` })
    .from(schema.reservedAmounts)
    .where(
      and(
        eq(schema.reservedAmounts.userId, userId),
        isNull(schema.reservedAmounts.deletedAt)
      )
    );
  const reservedPaise = reservedResult?.total ?? 0;

  // Fetch active monthly subscriptions and compute upcoming charges (within 7 days)
  const activeSubscriptions = await db
    .select()
    .from(schema.subscriptions)
    .where(
      and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.status, "active"),
        isNull(schema.subscriptions.deletedAt)
      )
    );

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let upcomingSubscriptionsPaise = 0;

  for (const sub of activeSubscriptions) {
    // Find most recent transaction matching this merchant
    const recentTxn = await db.query.transactions.findFirst({
      where: and(
        eq(schema.transactions.userId, userId),
        ilike(schema.transactions.merchant, `%${sub.merchant}%`),
        isNull(schema.transactions.deletedAt)
      ),
      orderBy: (t, { desc }) => [desc(t.occurredAt)],
    });

    const baseDate = recentTxn
      ? new Date(recentTxn.occurredAt)
      : new Date(sub.createdAt);

    const nextChargeDate = new Date(baseDate);
    if (sub.cadence === "monthly") {
      nextChargeDate.setMonth(nextChargeDate.getMonth() + 1);
    } else {
      nextChargeDate.setFullYear(nextChargeDate.getFullYear() + 1);
    }

    // Only include if next charge is within 7 days
    if (nextChargeDate >= now && nextChargeDate <= sevenDaysFromNow) {
      upcomingSubscriptionsPaise += sub.amountPaise;
    }
  }

  const safeToSpendPaise = balancePaise - reservedPaise - upcomingSubscriptionsPaise;

  let warning: SafeToSpend["warning"] = null;
  if (safeToSpendPaise < 0) {
    warning = "insufficient";
  } else if (safeToSpendPaise < 50000) {
    warning = "low_balance";
  }

  return {
    balance_paise: balancePaise,
    reserved_paise: reservedPaise,
    upcoming_subscriptions_paise: upcomingSubscriptionsPaise,
    safe_to_spend_paise: safeToSpendPaise,
    warning,
  };
}
