import { eq, and, isNull, gte, desc } from "drizzle-orm";
import { getDb, schema } from "@workspace/db";
import { detectRecurring, type DetectedSubscription } from "../lib/recurringDetector";

export async function runSubscriptionDetection(
  userId: string
): Promise<{ detected: number; skipped: number }> {
  const db = getDb();

  // Fetch last 13 months of debit transactions
  const thirteenMonthsAgo = new Date();
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

  const transactions = await db
    .select()
    .from(schema.transactions)
    .where(
      and(
        eq(schema.transactions.userId, userId),
        eq(schema.transactions.type, "debit"),
        isNull(schema.transactions.deletedAt),
        gte(schema.transactions.occurredAt, thirteenMonthsAgo)
      )
    )
    .orderBy(schema.transactions.occurredAt);

  // Run detection
  const detected = detectRecurring(transactions);

  let detectedCount = 0;
  let skippedCount = 0;

  for (const sub of detected) {
    // Only process confidence >= 0.5
    if (sub.confidence < 0.5) continue;

    // Check if subscription already exists
    const existing = await db.query.subscriptions.findFirst({
      where: and(
        eq(schema.subscriptions.userId, userId),
        eq(schema.subscriptions.merchant, sub.merchant),
        isNull(schema.subscriptions.deletedAt)
      ),
    });

    if (existing) {
      skippedCount++;
      continue;
    }

    // Insert subscription
    const now = new Date();
    await db.insert(schema.subscriptions).values({
      userId,
      merchant: sub.merchant,
      amountPaise: sub.amount_paise,
      cadence: sub.cadence,
      detectedFromTxnId: sub.last_txn_id,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Insert notification
    const amountFormatted = formatAmount(sub.amount_paise);
    const cadenceText = sub.cadence === "monthly" ? "month" : "year";

    await db.insert(schema.notifications).values({
      userId,
      type: "info",
      title: "Subscription Detected",
      body: `We noticed a ${amountFormatted} charge from ${sub.merchant} every ${cadenceText}. Tap to review.`,
      isRead: false,
      createdAt: now,
      updatedAt: now,
    });

    detectedCount++;
  }

  return { detected: detectedCount, skipped: skippedCount };
}

function formatAmount(paise: number): string {
  const rupees = paise / 100;
  if (paise % 100 === 0) {
    return `₹${rupees}`;
  }
  return `₹${rupees.toFixed(2)}`;
}
