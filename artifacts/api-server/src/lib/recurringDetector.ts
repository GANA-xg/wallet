import type { Transaction } from "@workspace/db/schema";

export type DetectedSubscription = {
  merchant: string;
  amount_paise: number;
  cadence: "monthly" | "yearly";
  last_txn_id: string;
  confidence: number;
  occurrences: number;
};

const NOISE_WORDS = new Set([
  "india",
  "pvt",
  "ltd",
  "technologies",
  "tech",
  "payment",
  "payments",
  "services",
  "private",
  "limited",
  "online",
  "digital",
]);

export function normalise(merchant: string): string {
  let normalized = merchant.toLowerCase();

  // Strip punctuation - keep alphanumeric and spaces
  normalized = normalized.replace(/[^a-z0-9\s]/g, "");

  // Collapse multiple spaces to one
  normalized = normalized.replace(/\s+/g, " ").trim();

  // Split into words and filter noise words (whole word match only)
  const words = normalized.split(" ");
  const filtered = words.filter((word) => !NOISE_WORDS.has(word));

  return filtered.join(" ");
}

export function medianInterval(dates: Date[]): number {
  if (dates.length < 2) {
    return Infinity;
  }

  const sorted = [...dates].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]).getTime();
    const curr = new Date(sorted[i]).getTime();
    const days = (curr - prev) / (1000 * 60 * 60 * 24);
    gaps.push(days);
  }

  if (gaps.length === 0) return Infinity;

  gaps.sort((a, b) => a - b);
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0
    ? (gaps[mid - 1] + gaps[mid]) / 2
    : gaps[mid];
}

function computeAmountVariance(
  amounts: number[],
  median: number
): { variancePercent: number; isLowVariance: boolean; isHighVariance: boolean } {
  if (amounts.length === 0 || median === 0) {
    return { variancePercent: 0, isLowVariance: false, isHighVariance: false };
  }

  const variancePercent =
    (amounts.reduce((sum, amt) => sum + Math.abs(amt - median), 0) /
      amounts.length /
      median) *
    100;

  return {
    variancePercent,
    isLowVariance: variancePercent < 5,
    isHighVariance: variancePercent > 10,
  };
}

function groupByMerchant(
  transactions: Transaction[]
): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();

  for (const txn of transactions) {
    if (!txn.merchant) continue;

    const norm = normalise(txn.merchant);
    const existing = groups.get(norm) || [];
    existing.push(txn);
    groups.set(norm, existing);
  }

  return groups;
}

export function detectRecurring(
  transactions: Transaction[]
): DetectedSubscription[] {
  const results: DetectedSubscription[] = [];
  const groups = groupByMerchant(transactions);

  const thirteenMonthsAgo = new Date();
  thirteenMonthsAgo.setMonth(thirteenMonthsAgo.getMonth() - 13);

  for (const [merchant, txns] of groups) {
    // Only consider debit transactions
    const debits = txns
      .filter((t) => t.type === "debit")
      .sort(
        (a, b) =>
          new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
      );

    if (debits.length < 1) continue;

    // Calculate median amount
    const amounts = debits.map((t) => t.amountPaise);
    amounts.sort((a, b) => a - b);
    const mid = Math.floor(amounts.length / 2);
    const medianAmount =
      amounts.length % 2 === 0
        ? (amounts[mid - 1] + amounts[mid]) / 2
        : amounts[mid];

    const dates = debits.map((t) => new Date(t.occurredAt));
    const medianGap = medianInterval(dates);

    // Determine cadence
    let cadence: "monthly" | "yearly" | null = null;
    let confidence = 0.5;
    let occurrences = debits.length;

    // Check for monthly cadence
    if (medianGap >= 25 && medianGap <= 35 && debits.length >= 2) {
      cadence = "monthly";
    }
    // Check for yearly cadence
    else if (medianGap >= 340 && medianGap <= 390 && debits.length >= 2) {
      cadence = "yearly";
    }
    // Single occurrence with high amount - suspected yearly
    else if (debits.length === 1 && medianAmount > 50000) {
      cadence = "yearly";
      confidence = 0.4;
      occurrences = 1;
    }

    if (!cadence) continue;

    // Amount variance check
    const { isLowVariance, isHighVariance } = computeAmountVariance(
      amounts,
      medianAmount
    );

    // Confidence scoring
    confidence = 0.5;
    confidence += Math.min(0.4, (occurrences - 1) * 0.1);
    if (isLowVariance) confidence += 0.1;
    if (isHighVariance) confidence -= 0.1;
    confidence = Math.max(0, Math.min(1, confidence));

    results.push({
      merchant,
      amount_paise: medianAmount,
      cadence,
      last_txn_id: debits[debits.length - 1].id,
      confidence,
      occurrences,
    });
  }

  // Sort by confidence DESC, then amount DESC
  results.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.amount_paise - a.amount_paise;
  });

  return results;
}