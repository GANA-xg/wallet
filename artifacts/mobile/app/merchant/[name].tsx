import { Feather } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import * as api from "@/services/api";

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function MerchantDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!name) return;
    (async () => {
      try {
        const res = await api.getMerchantHistory(decodeURIComponent(name));
        setData(res);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, [name]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 40 }}
    >
      <View style={{ paddingTop: topPad + spacing.lg, paddingHorizontal: spacing.base }}>
        {loading ? (
          <>
            <Skeleton width={200} height={28} borderRadius={4} />
            <Skeleton width={160} height={14} borderRadius={4} style={{ marginTop: spacing.md }} />
            <View style={[styles.chipRow, { marginTop: spacing.lg }]}>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} width={100} height={40} borderRadius={radius.md} />
              ))}
            </View>
            {[1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.monthRow, { borderBottomColor: colors.border }]}>
                <Skeleton width={60} height={14} borderRadius={4} />
                <Skeleton width={80} height={14} borderRadius={4} />
                <Skeleton width={40} height={14} borderRadius={4} />
              </View>
            ))}
          </>
        ) : data ? (
          <>
            <View style={styles.headerRow}>
              <Feather name="briefcase" size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>
                {decodeURIComponent(name ?? "")}
              </Text>
            </View>
            <Text style={[styles.allTime, { color: colors.mutedForeground }]}>
              All time: {formatRupees(data.total_all_time_paise ?? 0)}
            </Text>

            {/* Summary chips */}
            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chipValue, { color: colors.text }]}>{formatRupees(data.total_this_month_paise ?? 0)}</Text>
                <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>This month</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chipValue, { color: colors.text }]}>{formatRupees(data.total_last_month_paise ?? 0)}</Text>
                <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>Last month</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.chipValue, { color: colors.text }]}>{formatRupees(data.total_all_time_paise ?? 0)}</Text>
                <Text style={[styles.chipLabel, { color: colors.mutedForeground }]}>All time</Text>
              </View>
            </View>

            {/* Monthly breakdown */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
              Monthly Breakdown
            </Text>
            {(data.monthly_breakdown ?? []).map((m: any, i: number) => (
              <View key={i} style={[styles.monthRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.monthLabel, { color: colors.text }]}>{m.month}</Text>
                <Text style={[styles.monthAmount, { color: colors.text, fontWeight: "800" }]}>
                  {formatRupees(m.total_paise ?? 0)}
                </Text>
                <Text style={[styles.monthCount, { color: colors.mutedForeground }]}>
                  {m.count ?? 0} txns
                </Text>
              </View>
            ))}

            {/* Recent transactions */}
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
              Recent Transactions
            </Text>
            {(data.transactions ?? []).map((tx: any) => (
              <View key={tx.id} style={[styles.txRow, { borderBottomColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.txMerchant, { color: colors.text }]}>{tx.merchant ?? ""}</Text>
                  <Text style={[styles.txDate, { color: colors.mutedForeground }]}>
                    {new Date(tx.occurredAt ?? "").toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === "debit" ? "#EF4444" : "#10B981" }]}>
                  {formatRupees(tx.amountPaise ?? 0)}
                </Text>
              </View>
            ))}
          </>
        ) : (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data found for this merchant.</Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  title: { fontSize: 22, fontWeight: "800" },
  allTime: { fontSize: 14, fontWeight: "500", marginBottom: spacing.md },
  chipRow: { flexDirection: "row", gap: spacing.sm },
  chip: { flex: 1, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, alignItems: "center" },
  chipValue: { fontSize: 14, fontWeight: "800" },
  chipLabel: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  monthRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  monthLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  monthAmount: { fontSize: 14, marginRight: spacing.md },
  monthCount: { fontSize: 12, fontWeight: "500" },
  txRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  txMerchant: { fontSize: 14, fontWeight: "600" },
  txDate: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: "800" },
  emptyText: { fontSize: 14, fontWeight: "500", textAlign: "center", marginTop: 60 },
});
