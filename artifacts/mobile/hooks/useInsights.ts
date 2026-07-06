import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useWallet } from "@/context/WalletContext";
import {
  cacheInsights,
  generateInsights,
  getCachedInsights,
} from "@/services/insights/api";
import type { InsightsRequestPayload, InsightsResponse } from "@/services/insights/types";

const insightsQueryKey = ["insights"] as const;

export function generateInsightsPayload(
  transactions: any[],
  budgets: any[],
  reservedAmounts: any[],
  balance: number,
): InsightsRequestPayload {
  return {
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      type: t.type,
      category: t.category,
      description: t.description,
      date: t.date,
      status: t.status,
      merchant: t.merchant,
    })),
    budgets: budgets.map((b) => ({
      id: b.id,
      category: b.category,
      limit: b.limit,
      spent: b.spent,
    })),
    reservedAmounts: reservedAmounts.map((r) => ({
      id: r.id,
      label: r.label,
      amount: r.amount,
      category: r.category,
      dueDate: r.dueDate,
      recurring: r.recurring,
    })),
    balance,
  };
}

export function useInsights() {
  const wallet = useWallet();
  const [cachedData, setCachedData] = useState<InsightsResponse | null>(null);

  useEffect(() => {
    getCachedInsights().then(setCachedData);
  }, []);

  const payload = generateInsightsPayload(
    wallet.transactions,
    wallet.budgets,
    wallet.reservedAmounts,
    wallet.balance,
  );

  const query = useQuery<InsightsResponse, Error>({
    queryKey: [...insightsQueryKey, payload.balance],
    queryFn: async () => {
      const result = await generateInsights(payload);
      await cacheInsights(result);
      return result;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });

  return {
    data: query.data ?? cachedData,
    isLoading: query.isLoading && !cachedData,
    isRefreshing: query.isLoading && !!cachedData,
    isError: query.isError,
    error: query.error,
    refetch: () => query.refetch(),
    isStale: query.isStale,
    dataUpdatedAt: query.dataUpdatedAt,
  };
}
