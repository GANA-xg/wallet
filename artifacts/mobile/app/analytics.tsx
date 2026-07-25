import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Sharing from "expo-sharing";

import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import * as api from "@/services/api";

type PeriodKey = "week" | "month" | "quarter" | "year";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function shortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getDate()}`;
}

function shortMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return MONTHS_SHORT[d.getMonth()] ?? "";
}

function maxValue(items: number[]): number {
  return Math.max(...items, 1);
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const screenWidth = Dimensions.get("window").width;

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [breakdown, setBreakdown] = useState<any>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(true);
  const [dailySpending, setDailySpending] = useState<any>(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantLoading, setMerchantLoading] = useState(true);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [catTxns, setCatTxns] = useState<Record<string, any[]>>({});
  const [refreshing, setRefreshing] = useState(false);

  // Export sheet
  const [exportVisible, setExportVisible] = useState(false);
  const [exportFrom, setExportFrom] = useState("");
  const [exportTo, setExportTo] = useState("");
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");
  const [exportType, setExportType] = useState<"all" | "credit" | "debit">("all");
  const [exporting, setExporting] = useState(false);

  const fetchData = useCallback(async (p: PeriodKey) => {
    setBreakdownLoading(true);
    setDailyLoading(true);
    try {
      const [bd, ds, mf] = await Promise.all([
        api.getSpendingBreakdown({ period: p }),
        api.getDailySpending(),
        api.getMerchantFrequency(),
      ]);
      if (bd) setBreakdown(bd);
      if (ds) setDailySpending(ds);
      if (mf) setMerchants(mf.merchants ?? []);
    } catch {} finally {
      setBreakdownLoading(false);
      setDailyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(period);
    setMerchantLoading(false);
  }, [period, fetchData]);

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchData(period);
    setRefreshing(false);
  };

  const handleToggleCategory = async (cat: string) => {
    if (expandedCat === cat) {
      setExpandedCat(null);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCat(cat);
    if (!catTxns[cat]) {
      try {
        const res = await api.getTransactions({ category: cat, limit: 5 });
        setCatTxns((prev) => ({ ...prev, [cat]: res.transactions ?? [] }));
      } catch {}
    }
  };

  const handleExport = async () => {
    if (!exportFrom || !exportTo) {
      Alert.alert("Required", "Please enter both From and To dates.");
      return;
    }
    setExporting(true);
    try {
      const url = `${"YOUR_API_URL"}/api/analytics/statement?from=${exportFrom}&to=${exportTo}&format=${exportFormat}&type=${exportType}`;
      if (exportFormat === "csv") {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(url);
        } else {
          await Share.share({ message: url });
        }
      } else {
        const res = await api.getStatement({ from: exportFrom, to: exportTo, format: "json", type: exportType });
        Alert.alert("Statement Data", JSON.stringify(res.statement?.summary ?? res, null, 2));
      }
    } catch {
      Alert.alert("Error", "Failed to export statement.");
    } finally {
      setExporting(false);
      setExportVisible(false);
    }
  };

  const totalPaise = breakdown?.total_spent_paise ?? 0;
  const categories = breakdown?.by_category ?? [];
  const maxCatAmount = maxValue(categories.map((c: any) => c.total_paise ?? 0));

  // Daily chart
  const daily = dailySpending?.daily ?? [];
  const maxDaily = maxValue(daily.map((d: any) => d.total_paise ?? 0));
  const barW = Math.max(Math.min((screenWidth - spacing.base * 2 - 20) / Math.max(daily.length, 1), 8), 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <View style={{ paddingTop: topPad + spacing.lg, paddingHorizontal: spacing.base }}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Analytics & Spending</Text>

        {/* Period Pills */}
        <View style={styles.pillRow}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p.key}
              style={[styles.pill, { backgroundColor: period === p.key ? colors.primary : colors.surface, borderColor: period === p.key ? colors.primary : colors.border }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPeriod(p.key); }}
            >
              <Text style={[styles.pillText, { color: period === p.key ? "#FFFFFF" : colors.textSecondary }]}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Total Spent Hero */}
        {breakdownLoading ? (
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Skeleton width={160} height={36} borderRadius={4} />
            <Skeleton width={120} height={14} borderRadius={4} style={{ marginTop: spacing.sm }} />
          </View>
        ) : (
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.heroAmount, { color: colors.text }]}>{formatRupees(totalPaise)}</Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Total spent this {period}</Text>
          </View>
        )}

        {/* Categories */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>Categories</Text>
        {breakdownLoading
          ? [1, 2, 3, 4].map((i) => (
              <View key={i} style={[styles.catRow, { borderBottomColor: colors.border }]}>
                <Skeleton width={80} height={14} borderRadius={4} />
                <View style={{ flex: 1, marginHorizontal: spacing.md }}>
                  <Skeleton width="100%" height={8} borderRadius={4} />
                </View>
                <Skeleton width={60} height={14} borderRadius={4} />
              </View>
            ))
          : categories.map((cat: any) => {
              const pct = totalPaise > 0 ? (cat.total_paise / totalPaise * 100) : 0;
              const barPct = maxCatAmount > 0 ? (cat.total_paise / maxCatAmount * 100) : 0;
              const trendColor = cat.trend === "up" ? "#EF4444" : cat.trend === "down" ? "#10B981" : colors.mutedForeground;
              const trendArrow = cat.trend === "up" ? "↑" : cat.trend === "down" ? "↓" : "→";
              return (
                <TouchableOpacity
                  key={cat.category}
                  style={[styles.catRow, { borderBottomColor: colors.border }]}
                  onPress={() => handleToggleCategory(cat.category)}
                >
                  <View style={styles.catLeft}>
                    <Text style={[styles.catName, { color: colors.text }]}>{cat.category}</Text>
                    <View style={[styles.catBarBg, { backgroundColor: colors.surfaceElevated }]}>
                      <View style={[styles.catBarFill, { width: `${barPct}%`, backgroundColor: colors.primary }]} />
                    </View>
                    <View style={styles.catStats}>
                      <Text style={[styles.catPct, { color: colors.mutedForeground }]}>
                        {pct.toFixed(1)}% of spending
                      </Text>
                      <Text style={[styles.catTrend, { color: trendColor }]}>
                        {trendArrow} {cat.trend}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.catAmount, { color: colors.text }]}>
                    {formatRupees(cat.total_paise)}
                  </Text>
                </TouchableOpacity>
              );
            })}

        {/* Expanded category transactions */}
        {expandedCat && catTxns[expandedCat] && (
          <View style={[styles.expandedSection, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.expandedTitle, { color: colors.text }]}>Recent {expandedCat} transactions</Text>
            {catTxns[expandedCat].map((tx: any) => (
              <View key={tx.id} style={styles.expandedRow}>
                <Text style={[styles.expandedMerchant, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                  {tx.merchant ?? tx.description ?? ""}
                </Text>
                <Text style={[styles.expandedAmount, { color: tx.type === "debit" ? "#EF4444" : "#10B981" }]}>
                  {formatRupees((tx.amountPaise ?? 0))}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Daily Spending Chart */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
          Daily Spending — {dailySpending?.month ?? new Date().toISOString().slice(0, 7)}
        </Text>
        {dailyLoading ? (
          <Skeleton width="100%" height={140} borderRadius={radius.md} />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={[styles.chartContainer, { height: 120 }]}>
                {daily.map((d: any, i: number) => {
                  const h = maxDaily > 0 ? (d.total_paise / maxDaily) * 100 : 0;
                  const isHighest = d.total_paise === dailySpending?.highest_day?.total_paise && d.total_paise > 0;
                  return (
                    <View key={d.date} style={styles.dailyBarWrap}>
                      <View style={[styles.dailyBar, { height: Math.max(h, 2), backgroundColor: isHighest ? colors.primary : colors.surfaceElevated, width: barW }]} />
                      {i % 5 === 0 && (
                        <Text style={[styles.dailyLabel, { color: colors.mutedForeground }]}>{shortDate(d.date)}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
            {dailySpending && (
              <Text style={[styles.chartSummary, { color: colors.mutedForeground }]}>
                Avg {formatRupees(dailySpending.average_daily_paise ?? 0)}/day · Peak {formatRupees(dailySpending.highest_day?.total_paise ?? 0)} on {dailySpending.highest_day?.date ?? ""}
              </Text>
            )}
          </>
        )}

        {/* Top Merchants */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>Most Frequent</Text>
        {merchantLoading
          ? [1, 2, 3].map((i) => (
              <View key={i} style={[styles.merchantRow, { borderBottomColor: colors.border }]}>
                <Skeleton width={20} height={20} borderRadius={10} />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Skeleton width="50%" height={14} borderRadius={4} />
                  <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
                </View>
              </View>
            ))
          : merchants.slice(0, 5).map((m: any, i: number) => (
              <TouchableOpacity
                key={m.merchant ?? i}
                style={[styles.merchantRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <View style={[styles.rankBadge, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.rankText, { color: colors.primary }]}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.merchantName, { color: colors.text }]}>{m.merchant ?? "Unknown"}</Text>
                  <Text style={[styles.merchantMeta, { color: colors.mutedForeground }]}>
                    {m.count ?? 0} transactions · {formatRupees(m.total_paise ?? 0)}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}

        {/* Export Button */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: colors.primary }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setExportVisible(true); }}
        >
          <Feather name="download" size={18} color="#FFFFFF" />
          <Text style={styles.exportBtnText}>Download Statement</Text>
        </TouchableOpacity>

        {/* Export Sheet */}
        <Modal visible={exportVisible} transparent animationType="slide" onRequestClose={() => setExportVisible(false)}>
          <Pressable style={styles.overlay} onPress={() => setExportVisible(false)}>
            <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]}>
              <View style={[styles.handle, { backgroundColor: colors.mutedForeground }]} />
              <Text style={[styles.sheetTitle, { color: colors.text }]}>Export Statement</Text>

              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="From (YYYY-MM-DD)"
                placeholderTextColor={colors.mutedForeground}
                value={exportFrom}
                onChangeText={setExportFrom}
              />
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceElevated, color: colors.text, borderColor: colors.border }]}
                placeholder="To (YYYY-MM-DD)"
                placeholderTextColor={colors.mutedForeground}
                value={exportTo}
                onChangeText={setExportTo}
              />

              <View style={styles.exportToggleRow}>
                <TouchableOpacity style={[styles.exportToggle, { backgroundColor: exportFormat === "csv" ? colors.primary : colors.surface, borderColor: exportFormat === "csv" ? colors.primary : colors.border }]} onPress={() => setExportFormat("csv")}>
                  <Text style={[styles.exportToggleText, { color: exportFormat === "csv" ? "#FFFFFF" : colors.textSecondary }]}>CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.exportToggle, { backgroundColor: exportFormat === "json" ? colors.primary : colors.surface, borderColor: exportFormat === "json" ? colors.primary : colors.border }]} onPress={() => setExportFormat("json")}>
                  <Text style={[styles.exportToggleText, { color: exportFormat === "json" ? "#FFFFFF" : colors.textSecondary }]}>JSON</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.exportToggleRow}>
                {(["all", "credit", "debit"] as const).map((t) => (
                  <TouchableOpacity key={t} style={[styles.exportToggle, { backgroundColor: exportType === t ? colors.primary : colors.surface, borderColor: exportType === t ? colors.primary : colors.border }]} onPress={() => setExportType(t)}>
                    <Text style={[styles.exportToggleText, { color: exportType === t ? "#FFFFFF" : colors.textSecondary }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={[styles.exportSubmit, { backgroundColor: colors.primary }]} onPress={handleExport} disabled={exporting}>
                <Text style={styles.exportSubmitText}>{exporting ? "Exporting…" : "Export"}</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  pillRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  pill: { paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1 },
  pillText: { fontSize: 13, fontWeight: "700" },
  heroCard: { padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.md },
  heroAmount: { fontSize: 32, fontWeight: "800" },
  heroLabel: { fontSize: 13, fontWeight: "500", marginTop: spacing.xs },
  catRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  catLeft: { flex: 1, marginRight: spacing.md },
  catName: { fontSize: 14, fontWeight: "700", marginBottom: spacing.xs },
  catBarBg: { height: 6, borderRadius: 3, marginBottom: spacing.xs },
  catBarFill: { height: 6, borderRadius: 3 },
  catStats: { flexDirection: "row", gap: spacing.md },
  catPct: { fontSize: 11, fontWeight: "500" },
  catTrend: { fontSize: 11, fontWeight: "700" },
  catAmount: { fontSize: 15, fontWeight: "800" },
  expandedSection: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginTop: spacing.sm },
  expandedTitle: { fontSize: 13, fontWeight: "700", marginBottom: spacing.sm },
  expandedRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs },
  expandedMerchant: { fontSize: 13, fontWeight: "500" },
  expandedAmount: { fontSize: 13, fontWeight: "700" },
  chartContainer: { flexDirection: "row", alignItems: "flex-end", gap: 1, marginBottom: spacing.sm },
  dailyBarWrap: { alignItems: "center", width: 14 },
  dailyBar: { borderRadius: 2 },
  dailyLabel: { fontSize: 8, fontWeight: "500", marginTop: 2 },
  chartSummary: { fontSize: 12, fontWeight: "600", textAlign: "center", marginBottom: spacing.sm },
  merchantRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth },
  rankBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: spacing.md },
  rankText: { fontSize: 13, fontWeight: "800" },
  merchantName: { fontSize: 14, fontWeight: "600" },
  merchantMeta: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  exportBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: spacing.base, borderRadius: radius.md, marginTop: spacing.xl, marginBottom: spacing.xl },
  exportBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { padding: spacing.lg, paddingBottom: spacing.xl + 20, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  handle: { width: 36, height: 4, borderRadius: radius.full, alignSelf: "center", marginBottom: spacing.lg },
  sheetTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.base },
  input: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, fontSize: 14, fontWeight: "500", marginBottom: spacing.sm },
  exportToggleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm },
  exportToggle: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: "center" },
  exportToggleText: { fontSize: 13, fontWeight: "700" },
  exportSubmit: { paddingVertical: spacing.base, borderRadius: radius.md, alignItems: "center", marginTop: spacing.md },
  exportSubmitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
