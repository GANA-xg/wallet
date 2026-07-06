export interface TransactionInput {
  id: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  description: string;
  date: string;
  status: string;
  merchant: string;
}

export interface BudgetInput {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

export interface ReservedAmountInput {
  id: string;
  label: string;
  amount: number;
  category: string;
  dueDate?: string;
  recurring: boolean;
}

export interface InsightsRequest {
  transactions: TransactionInput[];
  budgets: BudgetInput[];
  reservedAmounts: ReservedAmountInput[];
  balance: number;
  upiLite?: number;
  month?: string;
  year?: number;
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
  trend: "up" | "down" | "stable";
  previousPeriodAmount: number;
}

export interface SpendingSummary {
  totalIncome: number;
  totalSpent: number;
  incomeCount: number;
  expenseCount: number;
  averageDailySpend: number;
  largestExpense: { amount: number; merchant: string; category: string } | null;
  largestIncome: { amount: number; merchant: string } | null;
  byCategory: Record<string, CategoryBreakdown>;
  topCategory: string | null;
  topCategoryAmount: number;
}

export interface BudgetRecommendation {
  category: string;
  limit: number;
  spent: number;
  percentage: number;
  status: "on_track" | "warning" | "exceeded" | "under_utilized";
  suggestedLimit?: number;
  reason: string;
}

export interface CashFlowForecast {
  currentBalance: number;
  projectedBalance: number;
  upcomingExpenses: { label: string; amount: number; dueDate: string }[];
  daysUntilDepletion: number | null;
  surplus: number;
  confidence: "high" | "medium" | "low";
}

export interface SavingsOpportunity {
  category: string;
  currentSpend: number;
  potentialSavings: number;
  suggestion: string;
  impact: "low" | "medium" | "high";
}

export interface UnusualTransaction {
  transactionId: string;
  amount: number;
  merchant: string;
  category: string;
  date: string;
  deviation: number;
  reason: string;
  severity: "low" | "medium" | "high";
}

export interface Subscription {
  name: string;
  amount: number;
  cycle: "Monthly" | "Yearly" | "Weekly" | "Quarterly";
  category: string;
  merchant: string;
  lastDate: string;
  confidence: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  spending: number;
  savings: number;
  topCategory: string;
}

export interface InsightRecommendation {
  icon: string;
  title: string;
  body: string;
  saving: string;
  color: string;
  priority: "low" | "medium" | "high";
}

export interface InsightsResponse {
  healthScore: number;
  healthLabel: string;
  month: string;
  year: number;
  spendingSummary: SpendingSummary;
  budgetRecommendations: BudgetRecommendation[];
  savingsOpportunities: SavingsOpportunity[];
  unusualTransactions: UnusualTransaction[];
  subscriptions: Subscription[];
  cashFlowForecast: CashFlowForecast;
  monthlyTrends: MonthlyTrend[];
  recommendations: InsightRecommendation[];
  generatedAt: string;
  provider: "local" | "llm";
}

export type AiProvider = "openai" | "gemini" | "claude" | "local";
