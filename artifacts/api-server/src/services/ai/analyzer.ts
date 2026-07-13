import type {
  BudgetInput,
  BudgetRecommendation,
  CashFlowForecast,
  CategoryBreakdown,
  InsightRecommendation,
  InsightsResponse,
  MonthlyTrend,
  ReservedAmountInput,
  SavingsOpportunity,
  SpendingSummary,
  Subscription,
  TransactionInput,
  UnusualTransaction,
} from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

interface AnalysisInput {
  transactions: TransactionInput[];
  budgets: BudgetInput[];
  reservedAmounts: ReservedAmountInput[];
  balance: number;
  month?: string;
  year?: number;
}

function getCurrentMonthInfo(month?: string, year?: number) {
  const now = new Date();
  return {
    month: month ?? MONTHS[now.getMonth()],
    year: year ?? now.getFullYear(),
    monthIndex: month ? MONTHS.indexOf(month) : now.getMonth(),
  };
}

function isCurrentMonth(date: string, monthIndex: number, year: number): boolean {
  const d = new Date(date);
  return d.getMonth() === monthIndex && d.getFullYear() === year;
}

function getMonthRange(monthIndex: number, year: number): { start: Date; end: Date } {
  return {
    start: new Date(year, monthIndex, 1),
    end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
}

function getPreviousMonthRange(monthIndex: number, year: number): { start: Date; end: Date } {
  const prev = new Date(year, monthIndex - 1, 1);
  return {
    start: new Date(prev.getFullYear(), prev.getMonth(), 1),
    end: new Date(prev.getFullYear(), prev.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function daysInMonth(monthIndex: number, year: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function computeSpendingSummary(
  transactions: TransactionInput[],
  monthIndex: number,
  year: number,
): SpendingSummary {
  const current = transactions.filter((t) => isCurrentMonth(t.date, monthIndex, year));
  const prevRange = getPreviousMonthRange(monthIndex, year);
  const previous = transactions.filter((t) => {
    const d = new Date(t.date);
    return d >= prevRange.start && d <= prevRange.end;
  });

  const credits = current.filter((t) => t.type === "credit");
  const debits = current.filter((t) => t.type === "debit");

  const totalIncome = credits.reduce((s, t) => s + t.amount, 0);
  const totalSpent = debits.reduce((s, t) => s + t.amount, 0);

  const today = new Date();
  const dayOfMonth = Math.min(today.getDate(), daysInMonth(monthIndex, year));
  const averageDailySpend = dayOfMonth > 0 ? totalSpent / dayOfMonth : 0;

  const largestExpense = debits.length > 0
    ? debits.reduce((max, t) => (t.amount > max.amount ? t : max), debits[0])
    : null;

  const largestIncome = credits.length > 0
    ? credits.reduce((max, t) => (t.amount > max.amount ? t : max), credits[0])
    : null;

  const byCategory: Record<string, { total: number; count: number; previousTotal: number }> = {};

  for (const t of current) {
    if (!byCategory[t.category]) {
      byCategory[t.category] = { total: 0, count: 0, previousTotal: 0 };
    }
    byCategory[t.category].total += t.amount;
    byCategory[t.category].count += 1;
  }

  for (const t of previous) {
    if (byCategory[t.category]) {
      byCategory[t.category].previousTotal += t.amount;
    }
  }

  const totalSpentForPercent = totalSpent || 1;
  const categoryBreakdown: Record<string, CategoryBreakdown> = {};
  let topCategory: string | null = null;
  let topCategoryAmount = 0;

  for (const [cat, data] of Object.entries(byCategory)) {
    const pct = (data.total / totalSpentForPercent) * 100;
    let trend: "up" | "down" | "stable" = "stable";
    if (data.previousTotal > 0) {
      const diff = data.total - data.previousTotal;
      trend = diff > data.previousTotal * 0.1 ? "up" : diff < -data.previousTotal * 0.1 ? "down" : "stable";
    }

    categoryBreakdown[cat] = {
      category: cat,
      total: data.total,
      count: data.count,
      percentage: Math.round(pct * 10) / 10,
      trend,
      previousPeriodAmount: data.previousTotal,
    };

    if (data.total > topCategoryAmount) {
      topCategoryAmount = data.total;
      topCategory = cat;
    }
  }

  return {
    totalIncome,
    totalSpent,
    incomeCount: credits.length,
    expenseCount: debits.length,
    averageDailySpend: Math.round(averageDailySpend * 100) / 100,
    largestExpense: largestExpense ? { amount: largestExpense.amount, merchant: largestExpense.merchant, category: largestExpense.category } : null,
    largestIncome: largestIncome ? { amount: largestIncome.amount, merchant: largestIncome.merchant } : null,
    byCategory: categoryBreakdown,
    topCategory,
    topCategoryAmount,
  };
}

function computeBudgetRecommendations(
  budgets: BudgetInput[],
): BudgetRecommendation[] {
  return budgets.map((b) => {
    const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
    let status: BudgetRecommendation["status"];
    let reason: string;

    if (pct >= 100) {
      status = "exceeded";
      reason = `You've exceeded your ${b.category} budget by ₹${(b.spent - b.limit).toLocaleString("en-IN")}. Consider increasing the limit or reducing spending.`;
    } else if (pct >= 80) {
      status = "warning";
      reason = `You've used ${Math.round(pct)}% of your ${b.category} budget. Spend carefully for the rest of the month.`;
    } else if (pct <= 30) {
      status = "under_utilized";
      reason = `You've only used ${Math.round(pct)}% of your ${b.category} budget. You could reduce this allocation.`;
    } else {
      status = "on_track";
      reason = `Your ${b.category} spending is on track at ${Math.round(pct)}% of budget.`;
    }

    return {
      category: b.category,
      limit: b.limit,
      spent: b.spent,
      percentage: Math.round(pct * 10) / 10,
      status,
      suggestedLimit: status === "under_utilized" ? Math.round(b.limit * 0.7) : status === "exceeded" ? Math.round(b.limit * 1.2) : undefined,
      reason,
    };
  });
}

function detectSubscriptions(
  transactions: TransactionInput[],
  monthIndex: number,
  year: number,
): Subscription[] {
  const current = transactions.filter((t) => isCurrentMonth(t.date, monthIndex, year) && t.type === "debit");

  const merchantAmounts = new Map<string, { amounts: number[]; dates: string[]; category: string }>();

  for (const t of current) {
    const key = `${t.merchant}|${t.amount}`;
    const existing = merchantAmounts.get(t.merchant);
    if (existing) {
      const hasSameAmount = existing.amounts.some((a) => Math.abs(a - t.amount) < 1);
      if (hasSameAmount) {
        existing.amounts.push(t.amount);
        existing.dates.push(t.date);
      }
    } else {
      merchantAmounts.set(t.merchant, { amounts: [t.amount], dates: [t.date], category: t.category });
    }
  }

  const subscriptions: Subscription[] = [];
  const now = new Date();

  const knownSubscriptionMerchants: Record<string, { name: string; cycle: Subscription["cycle"] }> = {
    "Netflix": { name: "Netflix", cycle: "Monthly" },
    "Spotify": { name: "Spotify", cycle: "Monthly" },
    "Amazon Prime": { name: "Amazon Prime", cycle: "Yearly" },
    "Hotstar": { name: "Hotstar", cycle: "Monthly" },
    "Zomato": { name: "Zomato Gold", cycle: "Monthly" },
    "Swiggy": { name: "Swiggy One", cycle: "Monthly" },
  };

  for (const t of current) {
    const known = knownSubscriptionMerchants[t.merchant];
    if (known) {
      const existing = subscriptions.find((s) => s.name === known.name);
      if (!existing) {
        subscriptions.push({
          name: known.name,
          amount: t.amount,
          cycle: known.cycle,
          category: t.category,
          merchant: t.merchant,
          lastDate: t.date,
          confidence: 0.9,
        });
      }
      continue;
    }

    const data = merchantAmounts.get(t.merchant);
    if (data && data.amounts.length >= 1) {
      const isRecurringAmount = [99, 119, 149, 199, 299, 349, 499, 649, 749, 999, 1299, 1499, 1799, 1999].includes(Math.round(t.amount));
      if (isRecurringAmount) {
        const existing = subscriptions.find((s) => s.merchant === t.merchant);
        if (!existing) {
          subscriptions.push({
            name: t.merchant,
            amount: t.amount,
            cycle: "Monthly",
            category: t.category,
            merchant: t.merchant,
            lastDate: t.date,
            confidence: 0.5,
          });
        }
      }
    }
  }

  return subscriptions.sort((a, b) => b.amount - a.amount);
}

function detectUnusualTransactions(
  transactions: TransactionInput[],
  monthIndex: number,
  year: number,
): UnusualTransaction[] {
  const current = transactions.filter((t) => isCurrentMonth(t.date, monthIndex, year) && t.type === "debit");

  const categoryAmounts = new Map<string, number[]>();
  for (const t of current) {
    const amounts = categoryAmounts.get(t.category) ?? [];
    amounts.push(t.amount);
    categoryAmounts.set(t.category, amounts);
  }

  const categoryStats = new Map<string, { mean: number; stdDev: number }>();
  for (const [cat, amounts] of categoryAmounts) {
    if (amounts.length < 2) {
      categoryStats.set(cat, { mean: amounts[0] ?? 0, stdDev: 0 });
      continue;
    }
    const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
    const variance = amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    categoryStats.set(cat, { mean, stdDev });
  }

  const unusual: UnusualTransaction[] = [];

  for (const t of current) {
    const stats = categoryStats.get(t.category);
    if (!stats) continue;
    if (stats.stdDev === 0) continue;

    const zScore = Math.abs((t.amount - stats.mean) / stats.stdDev);
    if (zScore > 1.5) {
      let severity: UnusualTransaction["severity"];
      let reason: string;

      if (zScore > 3) {
        severity = "high";
        reason = `This ${t.category} expense of ₹${t.amount.toLocaleString("en-IN")} at ${t.merchant} is significantly higher than your usual ₹${Math.round(stats.mean).toLocaleString("en-IN")} average.`;
      } else if (zScore > 2) {
        severity = "medium";
        reason = `This ₹${t.amount.toLocaleString("en-IN")} ${t.category} transaction at ${t.merchant} is above your typical spending pattern.`;
      } else {
        severity = "low";
        reason = `Slightly higher than usual ${t.category} spend at ${t.merchant}.`;
      }

      unusual.push({
        transactionId: t.id,
        amount: t.amount,
        merchant: t.merchant,
        category: t.category,
        date: t.date,
        deviation: Math.round(zScore * 10) / 10,
        reason,
        severity,
      });
    }
  }

  return unusual.sort((a, b) => b.deviation - a.deviation);
}

function computeCashFlowForecast(
  transactions: TransactionInput[],
  reservedAmounts: ReservedAmountInput[],
  balance: number,
  monthIndex: number,
  year: number,
): CashFlowForecast {
  const upcomingExpenses = reservedAmounts
    .filter((r) => r.dueDate)
    .map((r) => ({
      label: r.label,
      amount: r.amount,
      dueDate: r.dueDate!,
    }))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const totalUpcoming = upcomingExpenses.reduce((s, e) => s + e.amount, 0);

  const currentDebits = transactions
    .filter((t) => isCurrentMonth(t.date, monthIndex, year) && t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  const currentCredits = transactions
    .filter((t) => isCurrentMonth(t.date, monthIndex, year) && t.type === "credit")
    .reduce((s, t) => s + t.amount, 0);

  const dailyBurn = daysInMonth(monthIndex, year) > 0
    ? currentDebits / daysInMonth(monthIndex, year)
    : 0;

  const daysLeft = daysInMonth(monthIndex, year) - Math.min(new Date().getDate(), daysInMonth(monthIndex, year));
  const projectedAdditionalSpend = dailyBurn * daysLeft;
  const projectedBalance = balance - projectedAdditionalSpend - totalUpcoming;
  const surplus = currentCredits - currentDebits;

  let daysUntilDepletion: number | null = null;
  if (dailyBurn > 0) {
    const available = balance - totalUpcoming;
    daysUntilDepletion = available > 0 ? Math.floor(available / dailyBurn) : 0;
  }

  const confidence: CashFlowForecast["confidence"] =
    daysLeft <= 7 ? "high" : daysLeft <= 20 ? "medium" : "low";

  return {
    currentBalance: balance,
    projectedBalance: Math.round(projectedBalance * 100) / 100,
    upcomingExpenses,
    daysUntilDepletion,
    surplus: Math.round(surplus * 100) / 100,
    confidence,
  };
}

function computeMonthlyTrends(
  transactions: TransactionInput[],
  currentMonthIndex: number,
  currentYear: number,
): MonthlyTrend[] & { previousMonth: { income: number; spending: number } | null } {
  const trends: MonthlyTrend[] = [];

  for (let offset = 0; offset < 3; offset++) {
    const mi = currentMonthIndex - offset;
    const yr = mi >= 0 ? currentYear : currentYear - 1;
    const normalizedMi = ((mi % 12) + 12) % 12;
    const actualYear = mi >= 0 ? yr : yr - 1;

    const range = getMonthRange(normalizedMi, actualYear);
    const monthTxs = transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= range.start && d <= range.end;
    });

    const income = monthTxs.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
    const spending = monthTxs.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);

    const byCat = new Map<string, number>();
    for (const t of monthTxs.filter((t2) => t2.type === "debit")) {
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
    }
    let topCat = "Other";
    let topAmt = 0;
    for (const [cat, amt] of byCat) {
      if (amt > topAmt) {
        topAmt = amt;
        topCat = cat;
      }
    }

    trends.push({
      month: MONTHS[normalizedMi],
      income,
      spending,
      savings: income - spending,
      topCategory: topCat,
    });
  }

  return Object.assign(trends, {
    previousMonth: trends.length > 1
      ? { income: trends[1].income, spending: trends[1].spending }
      : null,
  });
}

function computeSavingsOpportunities(
  spendingSummary: SpendingSummary,
): SavingsOpportunity[] {
  const opportunities: SavingsOpportunity[] = [];
  const highSpendCategories = Object.entries(spendingSummary.byCategory)
    .filter(([_, data]) => data.percentage >= 15)
    .sort(([, a], [, b]) => b.total - a.total);

  for (const [category, data] of highSpendCategories) {
    const potentialSavings = Math.round(data.total * 0.2);
    if (potentialSavings < 100) continue;

    let suggestion: string;
    let impact: SavingsOpportunity["impact"];

    if (potentialSavings > 5000) {
      impact = "high";
      suggestion = category === "food"
        ? `You spent ₹${data.total.toLocaleString("en-IN")} on food. Cook at home 3x/week to save ₹${potentialSavings.toLocaleString("en-IN")}/month.`
        : category === "shopping"
          ? `Shopping cost ₹${data.total.toLocaleString("en-IN")}. Wait 48h before non-essential purchases to save ₹${potentialSavings.toLocaleString("en-IN")}/month.`
          : category === "transport"
            ? `Transport cost ₹${data.total.toLocaleString("en-IN")}. Use public transit 2x/week to save ₹${potentialSavings.toLocaleString("en-IN")}/month.`
            : `Reduce ${category} spending by 20% to save ₹${potentialSavings.toLocaleString("en-IN")}/month.`;
    } else if (potentialSavings > 1000) {
      impact = "medium";
      suggestion = `Cutting ${category} by 20% could save ₹${potentialSavings.toLocaleString("en-IN")}/month.`;
    } else {
      impact = "low";
      suggestion = `Small savings possible in ${category} — look for discounts or alternatives.`;
    }

    opportunities.push({
      category,
      currentSpend: data.total,
      potentialSavings,
      suggestion,
      impact,
    });
  }

  if (spendingSummary.totalIncome > spendingSummary.totalSpent) {
    const surplus = spendingSummary.totalIncome - spendingSummary.totalSpent;
    if (surplus > 1000) {
      opportunities.push({
        category: "savings",
        currentSpend: 0,
        potentialSavings: Math.round(surplus * 0.5),
        suggestion: `You have ₹${surplus.toLocaleString("en-IN")} surplus this month. Auto-invest ₹${Math.round(surplus * 0.5).toLocaleString("en-IN")} into a liquid fund or RD.`,
        impact: "high",
      });
    }
  }

  return opportunities.sort((a, b) => b.potentialSavings - a.potentialSavings);
}

function computeRecommendations(
  budgetRecommendations: BudgetRecommendation[],
  savingsOpportunities: SavingsOpportunity[],
  unusual: UnusualTransaction[],
  subscriptions: Subscription[],
  spendingSummary: SpendingSummary,
): InsightRecommendation[] {
  const recommendations: InsightRecommendation[] = [];

  const exceeded = budgetRecommendations.filter((b) => b.status === "exceeded");
  if (exceeded.length > 0) {
    const worst = exceeded[0];
    recommendations.push({
      icon: "trending-up",
      title: `Reduce ${worst.category} Spending`,
      body: worst.reason,
      saving: `₹${(worst.spent - worst.limit).toLocaleString("en-IN")}`,
      color: "#EF4444",
      priority: "high",
    });
  }

  for (const opp of savingsOpportunities.filter((o) => o.impact === "high").slice(0, 2)) {
    recommendations.push({
      icon: "trending-down",
      title: opp.category === "savings" ? "Automate Investments" : `Cut ${opp.category.charAt(0).toUpperCase() + opp.category.slice(1)}`,
      body: opp.suggestion,
      saving: `₹${opp.potentialSavings.toLocaleString("en-IN")}/mo`,
      color: "#22C55E",
      priority: "high",
    });
  }

  if (unusual.length > 0) {
    const topUnusual = unusual.filter((u) => u.severity === "high").slice(0, 2);
    for (const u of topUnusual) {
      recommendations.push({
        icon: "alert-triangle",
        title: "Unusual Transaction Detected",
        body: u.reason,
        saving: "Review",
        color: "#F59E0B",
        priority: "high",
      });
    }
  }

  const totalSubscriptions = subscriptions.reduce((s, sub) => s + sub.amount, 0);
  if (totalSubscriptions > 500) {
    recommendations.push({
      icon: "credit-card",
      title: "Review Subscriptions",
      body: `You spend ₹${totalSubscriptions.toLocaleString("en-IN")}/month on subscriptions. Audit unused services to save.`,
      saving: "₹500/mo+",
      color: "#3B82F6",
      priority: "medium",
    });
  }

  const overspendCats = Object.entries(spendingSummary.byCategory)
    .filter(([_, d]) => d.trend === "up" && d.percentage > 20)
    .slice(0, 1);
  for (const [cat] of overspendCats) {
    recommendations.push({
      icon: "bar-chart",
      title: `${cat} Spending Increasing`,
      body: `Your ${cat} spending is trending up this month. Set a stricter budget cap.`,
      saving: "Track it",
      color: "#8B5CF6",
      priority: "medium",
    });
  }

  if (spendingSummary.totalIncome > 0) {
    const savingsRate = ((spendingSummary.totalIncome - spendingSummary.totalSpent) / spendingSummary.totalIncome) * 100;
    if (savingsRate > 0 && savingsRate < 20) {
      recommendations.push({
        icon: "piggy-bank",
        title: "Boost Savings Rate",
        body: `Your savings rate is ${Math.round(savingsRate)}%. Aim for 20-30% by cutting discretionary spending.`,
        saving: `${Math.round(20 - savingsRate)}% more`,
        color: "#22C55E",
        priority: "medium",
      });
    }
  }

  return recommendations.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  });
}

function computeHealthScore(
  spendingSummary: SpendingSummary,
  budgetRecommendations: BudgetRecommendation[],
  subscriptions: Subscription[],
  reservedAmounts: ReservedAmountInput[],
): { score: number; label: string } {
  let score = 50;
  const maxScore = 100;
  const weight = { savings: 0.25, budget: 0.25, subscriptions: 0.2, reserves: 0.15, anomalies: 0.15 };

  const income = spendingSummary.totalIncome;
  const spent = spendingSummary.totalSpent;
  const savingsRate = income > 0 ? (income - spent) / income : 0;
  score += Math.round(savingsRate * weight.savings * maxScore);

  const exceeded = budgetRecommendations.filter((b) => b.status === "exceeded").length;
  const total = budgetRecommendations.length || 1;
  const budgetScore = ((total - exceeded) / total) * weight.budget * maxScore;
  score += budgetScore;

  const subCost = subscriptions.reduce((s, sub) => s + sub.amount, 0);
  const subRatio = income > 0 ? subCost / income : 0;
  if (subRatio < 0.05) score += weight.subscriptions * maxScore;
  else if (subRatio < 0.1) score += weight.subscriptions * maxScore * 0.6;
  else score += weight.subscriptions * maxScore * 0.2;

  if (reservedAmounts.length >= 2) score += weight.reserves * maxScore;
  else if (reservedAmounts.length >= 1) score += weight.reserves * maxScore * 0.5;

  const anomalyScore = Math.max(0, 1 - (spendingSummary.expenseCount > 0 ? spendingSummary.expenseCount / 30 : 0));
  score += anomalyScore * weight.anomalies * maxScore;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const label = finalScore >= 80 ? "Excellent" : finalScore >= 60 ? "Good" : finalScore >= 40 ? "Fair" : "Needs Work";

  return { score: finalScore, label };
}

export function analyze(input: AnalysisInput): InsightsResponse {
  const { month, year, transactions, budgets, reservedAmounts, balance } = input;
  const { month: monthName, year: yr, monthIndex } = getCurrentMonthInfo(month, year);

  const spendingSummary = computeSpendingSummary(transactions, monthIndex, yr);
  const budgetRecommendations = computeBudgetRecommendations(budgets);
  const subscriptions = detectSubscriptions(transactions, monthIndex, yr);
  const unusualTransactions = detectUnusualTransactions(transactions, monthIndex, yr);
  const cashFlowForecast = computeCashFlowForecast(transactions, reservedAmounts, balance, monthIndex, yr);
  const monthlyTrends = computeMonthlyTrends(transactions, monthIndex, yr);
  const savingsOpportunities = computeSavingsOpportunities(spendingSummary);
  const { score: healthScore, label: healthLabel } = computeHealthScore(spendingSummary, budgetRecommendations, subscriptions, reservedAmounts);
  const recommendations = computeRecommendations(budgetRecommendations, savingsOpportunities, unusualTransactions, subscriptions, spendingSummary);

  return {
    healthScore,
    healthLabel,
    month: monthName,
    year: yr,
    spendingSummary,
    budgetRecommendations,
    savingsOpportunities,
    unusualTransactions,
    subscriptions,
    cashFlowForecast,
    monthlyTrends: Array.isArray(monthlyTrends) ? monthlyTrends : [],
    recommendations,
    generatedAt: new Date().toISOString(),
    provider: "local",
  };
}

export function analyzeAllTime(transactions: TransactionInput[], budgets: BudgetInput[], reservedAmounts: ReservedAmountInput[], balance: number): InsightsResponse {
  const now = new Date();
  const allDebits = transactions.filter((t) => t.type === "debit");
  const allCredits = transactions.filter((t) => t.type === "credit");

  const totalIncome = allCredits.reduce((s, t) => s + t.amount, 0);
  const totalSpent = allDebits.reduce((s, t) => s + t.amount, 0);

  const byCategory: Record<string, number> = {};
  for (const t of allDebits) {
    byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;
  }

  const spendingSummary: SpendingSummary = {
    totalIncome,
    totalSpent,
    incomeCount: allCredits.length,
    expenseCount: allDebits.length,
    averageDailySpend: 0,
    largestExpense: allDebits.length > 0
      ? (() => { const m = allDebits.reduce((a, b) => a.amount > b.amount ? a : b); return { amount: m.amount, merchant: m.merchant, category: m.category }; })()
      : null,
    largestIncome: allCredits.length > 0
      ? (() => { const m = allCredits.reduce((a, b) => a.amount > b.amount ? a : b); return { amount: m.amount, merchant: m.merchant }; })()
      : null,
    byCategory: Object.entries(byCategory).reduce((acc, [cat, total]) => {
      acc[cat] = {
        category: cat,
        total,
        count: allDebits.filter((t) => t.category === cat).length,
        percentage: totalSpent > 0 ? Math.round((total / totalSpent) * 1000) / 10 : 0,
        trend: "stable",
        previousPeriodAmount: 0,
      };
      return acc;
    }, {} as Record<string, CategoryBreakdown>),
    topCategory: Object.entries(byCategory).sort(([, a], [, b]) => b - a)[0]?.[0] ?? null,
    topCategoryAmount: Math.max(...Object.values(byCategory), 0),
  };

  const budgetRecommendations = computeBudgetRecommendations(budgets);
  const subscriptions = detectSubscriptions(transactions, now.getMonth(), now.getFullYear());
  const unusualTransactions = detectUnusualTransactions(transactions, now.getMonth(), now.getFullYear());
  const cashFlowForecast = computeCashFlowForecast(transactions, reservedAmounts, balance, now.getMonth(), now.getFullYear());
  const monthlyTrends = computeMonthlyTrends(transactions, now.getMonth(), now.getFullYear());
  const savingsOpportunities = computeSavingsOpportunities(spendingSummary);
  const { score: healthScore, label: healthLabel } = computeHealthScore(spendingSummary, budgetRecommendations, subscriptions, reservedAmounts);
  const recommendations = computeRecommendations(budgetRecommendations, savingsOpportunities, unusualTransactions, subscriptions, spendingSummary);

  return {
    healthScore,
    healthLabel,
    month: "",
    year: now.getFullYear(),
    spendingSummary,
    budgetRecommendations,
    savingsOpportunities,
    unusualTransactions,
    subscriptions,
    cashFlowForecast,
    monthlyTrends: Array.isArray(monthlyTrends) ? monthlyTrends : [],
    recommendations,
    generatedAt: new Date().toISOString(),
    provider: "local",
  };
}
