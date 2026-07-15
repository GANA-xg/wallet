import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TransactionItem } from "@/components/TransactionItem";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { Transaction } from "@/types";

type Filter = "all" | "credit" | "debit" | "pending";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "credit", label: "Credit" },
  { key: "debit", label: "Debit" },
  { key: "pending", label: "Pending" },
];

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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.text }]}>Transactions</Text>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: "#0a1a10" }]}>
            <Feather name="arrow-down-left" size={14} color="#22C55E" />
            <View>
              <Text style={styles.summaryLabel}>Credit</Text>
              <Text style={[styles.summaryAmount, { color: "#22C55E" }]}>
                ₹{credit.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: "#1a0808" }]}>
            <Feather name="arrow-up-right" size={14} color="#EF4444" />
            <View>
              <Text style={styles.summaryLabel}>Debit</Text>
              <Text style={[styles.summaryAmount, { color: "#EF4444" }]}>
                ₹{debit.toLocaleString("en-IN")}
              </Text>
            </View>
          </View>
        </View>

        {/* Search */}
        <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={setQuery}
            selectionColor={colors.primary}
          />
          {!!query && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f.key ? colors.primary : colors.surface,
                },
              ]}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: filter === f.key ? "#fff" : colors.mutedForeground },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      </Animated.View>

      {/* Transaction List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        keyboardDismissMode="on-drag"
        renderItem={({ item }) => (
          <TransactionItem transaction={item} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              No transactions found
            </Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 },
        ]}
        ItemSeparatorComponent={null}
        style={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, gap: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: "800" },
  summaryRow: { flexDirection: "row", gap: 12 },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  summaryLabel: { color: "#B0B7C3", fontSize: 11, fontWeight: "500" },
  summaryAmount: { fontSize: 16, fontWeight: "800", marginTop: 2 },
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
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20 },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 16 },
});
