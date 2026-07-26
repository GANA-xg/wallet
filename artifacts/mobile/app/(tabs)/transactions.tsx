import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Skeleton, SkeletonTransaction } from "@/components/Skeleton";
import { TransactionItem } from "@/components/TransactionItem";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import type { Transaction } from "@/types";
import * as api from "@/services/api";

type Filter = "all" | "credit" | "debit" | "pending";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credit" },
  { key: "debit", label: "Debit" },
  { key: "pending", label: "Pending" },
];

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function totalCredit(txs: Transaction[]) {
  return txs.filter((t) => t.type === "credit").reduce((s, t) => s + t.amount, 0);
}

function totalDebit(txs: Transaction[]) {
  return txs.filter((t) => t.type === "debit").reduce((s, t) => s + t.amount, 0);
}

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { transactions } = useWallet();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [safeData, setSafeData] = useState<any>(null);
  const [s2sLoading, setS2sLoading] = useState(true);
  const [breakdown, setBreakdown] = useState<any>(null);
  const [bdLoading, setBdLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const accent = colors.primary;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const fetchInsights = useCallback(async () => {
    setS2sLoading(true);
    setBdLoading(true);
    try {
      const [s2s, bd] = await Promise.all([
        api.getSafeToSpend(),
        api.getSpendingBreakdown({ period: "month" }),
      ]);
      setSafeData(s2s);
      setBreakdown(bd);
    } catch {} finally {
      setS2sLoading(false);
      setBdLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchInsights();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    let result = transactions;
    if (filter === "credit") result = result.filter((t) => t.type === "credit");
    else if (filter === "debit") result = result.filter((t) => t.type === "debit");
    else if (filter === "pending") result = result.filter((t) => t.status === "pending");
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (t) =>
          t.merchant.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
      );
    }
    return result;
  }, [transactions, filter, query]);

  const credit = totalCredit(filtered);
  const debit = totalDebit(filtered);

  const safePaise = safeData?.safe_to_spend_paise ?? 0;
  const warning = safeData?.warning ?? null;
  const categories = breakdown?.by_category ?? [];
  const totalPaise = breakdown?.total_spent_paise ?? 0;

  const renderHeader = () => (
    <View style={[styles.headerWrap, { paddingTop: topPad + spacing.base }]}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: colors.text }]}>History</Text>
        <View style={styles.titleActions}>
          <TouchableOpacity
            style={[styles.titleIconBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => router.push("/cashflow")}
          >
            <Feather name="trending-up" size={18} color={accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.titleIconBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => router.push("/analytics")}
          >
            <Feather name="bar-chart-2" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.insightPills}>
        <TouchableOpacity
          style={[styles.pillBtn, { backgroundColor: accent }]}
          onPress={() => router.push("/cashflow")}
          activeOpacity={0.8}
        >
          <Feather name="trending-up" size={15} color="#fff" />
          <Text style={styles.pillBtnText}>Cash Flow</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.pillBtn, { backgroundColor: accent }]}
          onPress={() => router.push("/analytics")}
          activeOpacity={0.8}
        >
          <Feather name="bar-chart-2" size={15} color="#fff" />
          <Text style={styles.pillBtnText}>Analytics</Text>
        </TouchableOpacity>
      </View>

      {s2sLoading ? (
        <Skeleton width="100%" height={60} borderRadius={14} style={{ marginBottom: spacing.sm }} />
      ) : (
        <TouchableOpacity
          style={[styles.miniCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push("/cashflow")}
          activeOpacity={0.7}
        >
          <View style={styles.miniCardRow}>
            <View>
              <Text style={[styles.miniCardLabel, { color: colors.mutedForeground }]}>Safe to Spend</Text>
              <Text style={[styles.miniCardAmount, { color: safePaise < 0 ? "#EF4444" : colors.text }]}>
                {formatRupees(safePaise)}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
          {warning && (
            <Text style={[styles.miniCardWarn, { color: warning === "insufficient" ? "#EF4444" : "#F59E0B" }]}>
              {warning === "insufficient" ? "Won't cover upcoming bills" : "Low after upcoming bills"}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {bdLoading ? (
        <Skeleton width="100%" height={70} borderRadius={14} style={{ marginBottom: spacing.sm }} />
      ) : categories.length > 0 ? (
        <TouchableOpacity
          style={[styles.miniCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => router.push("/analytics")}
          activeOpacity={0.7}
        >
          <View style={styles.miniCardRow}>
            <Text style={[styles.miniCardLabel, { color: colors.mutedForeground }]}>
              This Month · {formatRupees(totalPaise)}
            </Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </View>
          <View style={styles.categoryStrip}>
            {categories.slice(0, 3).map((cat: any) => {
              const pct = totalPaise > 0 ? (cat.total_paise / totalPaise) * 100 : 0;
              return (
                <View key={cat.category} style={styles.categoryRow}>
                  <Text style={[styles.categoryLabel, { color: colors.textSecondary }]} numberOfLines={1}>{cat.category}</Text>
                  <View style={[styles.categoryBar, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={[styles.categoryFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: accent }]} />
                  </View>
                  <Text style={[styles.categoryPct, { color: colors.mutedForeground }]}>{pct.toFixed(0)}%</Text>
                </View>
              );
            })}
          </View>
        </TouchableOpacity>
      ) : null}

      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated }]}>
          <Feather name="arrow-down-left" size={14} color="#10B981" />
          <View>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Credit</Text>
            <Text style={[styles.summaryAmount, { color: "#10B981" }]}>
              ₹{credit.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: colors.surfaceElevated }]}>
          <Feather name="arrow-up-right" size={14} color="#EF4444" />
          <View>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Debit</Text>
            <Text style={[styles.summaryAmount, { color: "#EF4444" }]}>
              ₹{debit.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, { backgroundColor: filter === f.key ? accent : colors.surfaceElevated }]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, { color: filter === f.key ? "#fff" : colors.mutedForeground }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <View style={styles.listPad}>
          <Skeleton width="100%" height={28} borderRadius={4} style={{ marginVertical: topPad + 20 }} />
          <Skeleton width="100%" height={60} borderRadius={14} style={{ marginBottom: 12 }} />
          <Skeleton width="100%" height={70} borderRadius={14} style={{ marginBottom: 12 }} />
          <SkeletonTransaction />
          <SkeletonTransaction />
          <SkeletonTransaction />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardDismissMode="on-drag"
          ListHeaderComponent={renderHeader}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={40} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions found</Text>
            </View>
          }
          contentContainerStyle={[styles.listPad, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accent} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: { paddingHorizontal: 20, gap: 14, paddingBottom: 8 },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 28, fontWeight: "700" },
  titleActions: { flexDirection: "row", gap: spacing.sm },
  titleIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  insightPills: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pillBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  pillBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  miniCard: {
    padding: spacing.base,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 0,
  },
  miniCardRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  miniCardLabel: { fontSize: 12, fontWeight: "600", marginBottom: 2 },
  miniCardAmount: { fontSize: 20, fontWeight: "700" },
  miniCardWarn: { fontSize: 12, fontWeight: "600", marginTop: spacing.xs },
  categoryStrip: { gap: spacing.xs, marginTop: spacing.sm },
  categoryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  categoryLabel: { width: 60, fontSize: 11, fontWeight: "600" },
  categoryBar: { flex: 1, height: 6, borderRadius: 3 },
  categoryFill: { height: 6, borderRadius: 3 },
  categoryPct: { width: 32, fontSize: 10, fontWeight: "700", textAlign: "right" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  summaryLabel: { fontSize: 11, fontWeight: "600" },
  summaryAmount: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filters: { flexDirection: "row", gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterText: { fontSize: 14, fontWeight: "600" },
  listPad: { paddingHorizontal: 20 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 16 },
});
