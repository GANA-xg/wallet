import { analyze, analyzeAllTime } from "./analyzer";
import { generateEnhancedInsights } from "./llmProvider";
import type { InsightsRequest, InsightsResponse } from "./types";

export type { AiProvider, InsightsRequest, InsightsResponse } from "./types";

const insightCache = new Map<string, { data: InsightsResponse; timestamp: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function cacheKey(request: InsightsRequest): string {
  const txIds = request.transactions.map((t) => `${t.id}:${t.status}:${t.amount}`).join(",");
  const budgetIds = request.budgets.map((b) => `${b.id}:${b.spent}`).join(",");
  return `${txIds}|${budgetIds}|${request.balance}|${request.month ?? ""}|${request.year ?? ""}`;
}

function getCached(request: InsightsRequest): InsightsResponse | null {
  const key = cacheKey(request);
  const cached = insightCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  return null;
}

function setCache(request: InsightsRequest, data: InsightsResponse): void {
  const key = cacheKey(request);
  insightCache.set(key, { data, timestamp: Date.now() });

  if (insightCache.size > 100) {
    const oldest = insightCache.entries().next();
    if (oldest.value) insightCache.delete(oldest.value[0]);
  }
}

export async function generateInsights(request: InsightsRequest): Promise<InsightsResponse> {
  const cached = getCached(request);
  if (cached) {
    return { ...cached, generatedAt: cached.generatedAt };
  }

  const isCurrentMonth = request.month == null;
  const localInsights = isCurrentMonth
    ? analyze({
        transactions: request.transactions,
        budgets: request.budgets,
        reservedAmounts: request.reservedAmounts,
        balance: request.balance,
        month: request.month,
        year: request.year,
      })
    : analyzeAllTime(request.transactions, request.budgets, request.reservedAmounts, request.balance);

  const enhancedInsights = await generateEnhancedInsights(request, localInsights);

  setCache(request, enhancedInsights);
  return enhancedInsights;
}

export { analyze, analyzeAllTime } from "./analyzer";
export { generateEnhancedInsights } from "./llmProvider";
