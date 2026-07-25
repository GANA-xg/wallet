import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import * as api from "@/services/api";

type ForecastPeriod = 7 | 30 | 60;

const PERIOD_DAYS: { days: ForecastPeriod; label: string }[] = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 60, label: "60 days" },
];

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatRupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function shortMonth(dateStr: string): string {
  const d = new Date(dateStr);
  return MONTHS_SHORT[d.getMonth()] ?? "";
}

function maxValue(items: number[]): number {
  return Math.max(...items, 1);
}

export default function CashFlowScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const screenWidth = Dimensions.get("window").width;

  // Safe to spend
  const [s2s, setS2s] = useState<any>(null);
  const [s2sLoading, setS2sLoading] = useState(true);

  // Forecast
  const [period, setPeriod] = useState<ForecastPeriod>(30);
  const [forecast, setForecast] = useState<any>(null);
  const [forecastLoading, setForecastLoading] = useState(true);

  // Cashflow summary
  const [cashflowMonths, setCashflowMonths] = useState<any[]>([]);
  const [cashflowLoading, setCashflowLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const fetchSafeToSpend = useCallback(async () => {
    try {
      const res = await api.getSafeToSpend();
      setS2s(res);
    } catch {} finally {
      setS2sLoading(false);
    }
  }, []);

  const fetchForecast = useCallback(async (d: ForecastPeriod) => {
    setForecastLoading(true);
    try {
      const res = await api.getForecast(d);
      setForecast(res);
    } catch {} finally {
      setForecastLoading(false);
    }
  }, []);

  const fetchCashflowSummary = useCallback(async () => {
    try {
      const res = await api.getCashflowSummary();
      setCashflowMonths(res.months ?? []);
    } catch {} finally {
      setCashflowLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSafeToSpend();
    fetchForecast(30);
    fetchCashflowSummary();
  }, [fetchSafeToSpend, fetchForecast, fetchCashflowSummary]);

  useEffect(() => {
    fetchForecast(period);
  }, [period, fetchForecast]);

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setS2sLoading(true);
    setCashflowLoading(true);
    setForecastLoading(true);
    await Promise.all([fetchSafeToSpend(), fetchCashflowSummary(), fetchForecast(period)]);
    setRefreshing(false);
  };

  // Timeline grouping
  const timeline = forecast?.timeline ?? [];
  const groupedTimeline: Record<string, any[]> = {};
  for (const event of timeline) {
    if (!groupedTimeline[event.date]) groupedTimeline[event.date] = [];
    groupedTimeline[event.date].push(event);
  }
  const sortedDates = Object.keys(groupedTimeline).sort();

  const safePaise = s2s?.safe_to_spend_paise ?? 0;
  const reservedPaise = s2s?.reserved_paise ?? 0;
  const upcomingSubsPaise = s2s?.upcoming_subscriptions_paise ?? 0;
  const warning = s2s?.warning ?? null;

  // Bars for cashflow chart
  const allValues = cashflowMonths.flatMap((m) => [m.income_paise ?? 0, m.expenses_paise ?? 0]);
  const chartMax = maxValue(allValues);
  const barWidth = Math.min((screenWidth - spacing.base * 2 - spacing.md * (cashflowMonths.length - 1)) / cashflowMonths.length / 2 - 2, 40);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
    >
      <View style={{ paddingTop: topPad + spacing.lg, paddingHorizontal: spacing.base }}>
        {/* ── Safe to Spend ── */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cash Flow & Safe-to-Spend</Text>

        {s2sLoading ? (
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Skeleton width={180} height={40} borderRadius={4} />
            <Skeleton width={120} height={14} borderRadius={4} style={{ marginTop: spacing.sm }} />
          </View>
        ) : (
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.heroAmount, { color: safePaise < 0 ? "#EF4444" : colors.text }]}>
                {formatRupees(safePaise)}
              </Text>
              <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Safe to Spend</Text>
              <View style={styles.heroSubrow}>
                <Text style={[styles.heroSubtext, { color: colors.mutedForeground }]}>
                  {formatRupees(reservedPaise)} reserved · {formatRupees(upcomingSubsPaise)} upcoming bills
                </Text>
              </View>
            </View>

            {warning === "insufficient" && (
              <View style={[styles.warningBanner, { backgroundColor: "#EF444420", borderColor: "#EF4444" }]}>
                <Text style={styles.warningText}>
                  ⚠️ Balance won&apos;t cover upcoming obligations
                </Text>
              </View>
            )}
            {warning === "low_balance" && (
              <View style={[styles.warningBanner, { backgroundColor: "#F59E0B20", borderColor: "#F59E0B" }]}>
                <Text style={[styles.warningText, { color: "#F59E0B" }]}>
                  ⚠️ Low balance after upcoming bills
                </Text>
              </View>
            )}
          </>
        )}

        {/* ── Forecast ── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
          Forecast
        </Text>

        <View style={styles.pillRow}>
          {PERIOD_DAYS.map((p) => (
            <TouchableOpacity
              key={p.days}
              style={[
                styles.pill,
                {
                  backgroundColor: period === p.days ? colors.primary : colors.surface,
                  borderColor: period === p.days ? colors.primary : colors.border,
                },
              ]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPeriod(p.days); }}
            >
              <Text style={[styles.pillText, { color: period === p.days ? "#FFFFFF" : colors.textSecondary }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {forecast && (
          <View style={[styles.summaryRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryText, { color: "#10B981" }]}>
              Income {formatRupees(forecast.projected_income_paise ?? 0)}
            </Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}> · </Text>
            <Text style={[styles.summaryText, { color: "#EF4444" }]}>
              Expenses {formatRupees(forecast.projected_expenses_paise ?? 0)}
            </Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}> · </Text>
            <Text
              style={[
                styles.summaryText,
                { color: (forecast.net_paise ?? 0) >= 0 ? "#10B981" : "#EF4444" },
              ]}
            >
              Net {formatRupees(forecast.net_paise ?? 0)}
            </Text>
          </View>
        )}

        {/* ── Timeline ── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.lg }]}>
          Upcoming Events
        </Text>

        {forecastLoading ? (
          [1, 2, 3].map((i) => (
            <View key={i} style={[{ flexDirection: "row", alignItems: "center", marginBottom: spacing.md }]}>
              <Skeleton width={50} height={14} borderRadius={4} />
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Skeleton width="70%" height={14} borderRadius={4} />
                <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 4 }} />
              </View>
            </View>
          ))
        ) : sortedDates.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No upcoming events in this period</Text>
        ) : (
          sortedDates.map((date) => (
            <View key={date}>
              <Text style={[styles.dateHeader, { color: colors.mutedForeground }]}>
                {formatDate(date)}
              </Text>
              {groupedTimeline[date].map((event: any, idx: number) => {
                const isIn = event.direction === "in";
                const isEstimated = event.confidence === "estimated";
                return (
                  <View key={idx} style={styles.eventRow}>
                    <View style={[styles.eventLine, { backgroundColor: isIn ? "#10B981" : "#EF4444" }]} />
                    <View style={[styles.eventDot, { backgroundColor: isIn ? "#10B981" : "#EF4444" }]} />
                    <View style={styles.eventContent}>
                      <View style={styles.eventTop}>
                        <Feather
                          name={event.source === "subscription" ? "repeat" : event.source === "reserved" ? "lock" : "trending-up"}
                          size={12}
                          color={colors.mutedForeground}
                        />
                        <Text style={[styles.eventLabel, { color: colors.text }]} numberOfLines={1}>
                          {event.label}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.eventAmount}>
                      <Text style={[styles.amountText, { color: isIn ? "#10B981" : "#EF4444" }]}>
                        {isIn ? "+" : "-"}{formatRupees(event.amount_paise)}
                      </Text>
                      {isEstimated && (
                        <View style={[styles.estPill, { backgroundColor: colors.surfaceElevated }]}>
                          <Text style={[styles.estPillText, { color: colors.mutedForeground }]}>~est</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}

        {/* ── 6-Month Cash Flow Summary ── */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: spacing.xl }]}>
          Monthly Overview
        </Text>

        {cashflowLoading ? (
          <Skeleton width="100%" height={160} borderRadius={radius.md} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartRow}>
              {cashflowMonths.map((m: any) => {
                const income = m.income_paise ?? 0;
                const expenses = m.expenses_paise ?? 0;
                const incomeH = chartMax > 0 ? (income / chartMax) * 100 : 0;
                const expH = chartMax > 0 ? (expenses / chartMax) * 100 : 0;
                return (
                  <TouchableOpacity key={m.month} style={styles.barGroup}>
                    <View style={styles.barsContainer}>
                      <View style={[styles.bar, { height: Math.max(incomeH, 4), backgroundColor: "#10B981", width: barWidth }]} />
                      <View style={[styles.bar, { height: Math.max(expH, 4), backgroundColor: "#EF4444", width: barWidth }]} />
                    </View>
                    <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                      {shortMonth(m.month)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: spacing.md },
  heroCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  heroAmount: { fontSize: 36, fontWeight: "800" },
  heroLabel: { fontSize: 14, fontWeight: "600", marginTop: spacing.xs },
  heroSubrow: { marginTop: spacing.sm },
  heroSubtext: { fontSize: 12, fontWeight: "500" },
  warningBanner: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.sm,
  },
  warningText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  pillRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  pill: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  pillText: { fontSize: 13, fontWeight: "700" },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  summaryText: { fontSize: 13, fontWeight: "600" },
  emptyText: { fontSize: 14, fontWeight: "500", textAlign: "center", paddingVertical: spacing.xl },
  dateHeader: { fontSize: 12, fontWeight: "600", marginTop: spacing.md, marginBottom: spacing.sm, textTransform: "uppercase", letterSpacing: 1 },
  eventRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md, paddingLeft: spacing.xs },
  eventLine: { width: 2, height: "100%", position: "absolute", left: 5 },
  eventDot: { width: 10, height: 10, borderRadius: 5, marginRight: spacing.md },
  eventContent: { flex: 1 },
  eventTop: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  eventLabel: { fontSize: 14, fontWeight: "600", flex: 1 },
  eventAmount: { alignItems: "flex-end" },
  amountText: { fontSize: 14, fontWeight: "700" },
  estPill: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: radius.sm, marginTop: 2 },
  estPillText: { fontSize: 9, fontWeight: "600" },
  chartRow: { flexDirection: "row", gap: spacing.md, paddingVertical: spacing.md },
  barGroup: { alignItems: "center" },
  barsContainer: { flexDirection: "row", gap: 3, alignItems: "flex-end", height: 120 },
  bar: { borderRadius: radius.sm },
  barLabel: { fontSize: 10, fontWeight: "600", marginTop: spacing.xs },
});
