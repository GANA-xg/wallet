import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { useInsights } from "@/hooks/useInsights";

function HealthScore({ score, label }: { score: number; label: string }) {
  const colors = useColors();
  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = (score / 100) * circumference;

  const scoreColor = score >= 80 ? colors.success : score >= 60 ? colors.sunset : colors.error;

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(100)}>
      <View style={styles.healthContainer}>
        <View style={styles.healthRing}>
          <View
            style={[
              styles.healthCircleBg,
              { width: size, height: size, borderRadius: size / 2 },
            ]}
          />
          <View style={styles.healthInner}>
            <Text style={[styles.healthScoreNum, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.healthScoreLabel, { color: scoreColor }]}>{label}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function MetricCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.metricCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.metricIconBg, { backgroundColor: color + "20" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function LoadingSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
        Analyzing your finances…
      </Text>
    </View>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.errorContainer}>
      <View style={[styles.errorIconBg, { backgroundColor: colors.error + "15" }]}>
        <Feather name="alert-circle" size={40} color={colors.error} />
      </View>
      <Text style={[styles.errorTitle, { color: colors.text }]}>Could not load insights</Text>
      <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>{message}</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={() => {
          if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRetry();
        }}
      >
        <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.retryBtnGrad}>
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={[styles.retryBtnText, { color: colors.primaryForeground }]}>Try Again</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState() {
  const colors = useColors();
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconBg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Data Yet</Text>
      <Text style={[styles.emptyMessage, { color: colors.mutedForeground }]}>
        Add some transactions and budgets to get personalized AI insights about your spending
        patterns, savings opportunities, and financial health.
      </Text>
    </View>
  );
}

function SectionHeader({ title, count }: { title: string; count?: number }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {count !== undefined && (
        <View style={[styles.sectionCount, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionCountText, { color: colors.mutedForeground }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

function BudgetBar({ label, spent, limit, percentage, status }: {
  label: string;
  spent: number;
  limit: number;
  percentage: number;
  status: string;
}) {
  const colors = useColors();
  const barColor = status === "exceeded" ? colors.error : status === "warning" ? colors.sunset : status === "under_utilized" ? colors.primary : colors.success;

  return (
    <View style={styles.budgetRow}>
      <View style={styles.budgetHeader}>
        <Text style={[styles.budgetCategory, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.budgetAmount, { color: colors.mutedForeground }]}>
          ₹{spent.toLocaleString("en-IN")} / ₹{limit.toLocaleString("en-IN")}
        </Text>
      </View>
      <View style={[styles.budgetBarBg, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.budgetBarFill,
            {
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
      <Text style={[styles.budgetPercent, { color: colors.mutedForeground }]}>
        {Math.round(percentage)}% used
      </Text>
    </View>
  );
}

function RecommendationCard({
  icon,
  title,
  body,
  saving,
  color,
}: {
  icon: string;
  title: string;
  body: string;
  saving: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.recCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.recHeader}>
        <View style={[styles.recIcon, { backgroundColor: color + "20" }]}>
          <Feather name={icon as any} size={18} color={color} />
        </View>
        <View style={styles.recInfo}>
          <Text style={[styles.recTitle, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.recSaving, { color }]}>{saving}</Text>
        </View>
      </View>
      <Text style={[styles.recBody, { color: colors.mutedForeground }]}>{body}</Text>
    </View>
  );
}

function SubscriptionRow({
  name,
  amount,
  cycle,
  color,
}: {
  name: string;
  amount: number;
  cycle: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.subRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.subDot, { backgroundColor: color }]} />
      <View style={styles.subInfo}>
        <Text style={[styles.subName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.subCycle, { color: colors.mutedForeground }]}>{cycle}</Text>
      </View>
      <Text style={[styles.subAmount, { color: colors.text }]}>₹{amount.toLocaleString("en-IN")}</Text>
    </View>
  );
}

function AnomalyRow({
  merchant,
  amount,
  category,
  reason,
  severity,
}: {
  merchant: string;
  amount: number;
  category: string;
  reason: string;
  severity: string;
}) {
  const colors = useColors();
  const sevColor = severity === "high" ? colors.error : severity === "medium" ? colors.sunset : colors.primary;
  return (
    <View style={[styles.anomalyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.anomalyHeader}>
        <View style={[styles.anomalyBadge, { backgroundColor: sevColor + "20" }]}>
          <Text style={[styles.anomalyBadgeText, { color: sevColor }]}>
            {severity === "high" ? "High" : severity === "medium" ? "Medium" : "Low"}
          </Text>
        </View>
        <Text style={[styles.anomalyAmount, { color: colors.text }]}>
          ₹{amount.toLocaleString("en-IN")}
        </Text>
      </View>
      <Text style={[styles.anomalyMerchant, { color: colors.text }]}>{merchant}</Text>
      <Text style={[styles.anomalyCategory, { color: colors.mutedForeground }]}>
        {category}
      </Text>
      <Text style={[styles.anomalyReason, { color: colors.mutedForeground }]}>{reason}</Text>
    </View>
  );
}

function TrendRow({ month, income, spending, savings, topCategory }: {
  month: string;
  income: number;
  spending: number;
  savings: number;
  topCategory: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.trendRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.trendMonth, { color: colors.text }]}>{month}</Text>
      <View style={styles.trendNumbers}>
        <Text style={[styles.trendPositive, { color: colors.success }]}>
          +₹{income.toLocaleString("en-IN")}
        </Text>
        <Text style={[styles.trendNegative, { color: colors.error }]}>
          -₹{spending.toLocaleString("en-IN")}
        </Text>
      </View>
      <Text style={[styles.trendCategory, { color: colors.mutedForeground }]}>
        Top: {topCategory}
      </Text>
    </View>
  );
}

export default function AIInsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isRefreshing, isError, error, refetch } = useInsights();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Insights</Text>
          <View style={{ width: 38 }} />
        </View>
        <LoadingSkeleton />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Insights</Text>
          <View style={{ width: 38 }} />
        </View>
        <ErrorState message={error?.message ?? "Something went wrong"} onRetry={() => refetch()} />
      </View>
    );
  }

  if (!data || data.healthLabel === "No Data") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Insights</Text>
          <View style={{ width: 38 }} />
        </View>
        <EmptyState />
      </View>
    );
  }

  const {
    healthScore,
    healthLabel,
    spendingSummary,
    budgetRecommendations,
    subscriptions,
    unusualTransactions,
    recommendations,
    monthlyTrends,
    cashFlowForecast,
  } = data;

  const totalSubscriptions = subscriptions.reduce((s, sub) => s + sub.amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.duration(500).delay(0)}>
        <View style={[styles.headerRow, { paddingTop: topPad + 8 }]}>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={styles.backBtn}
          >
            <Feather name="chevron-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Insights</Text>
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              refetch();
            }}
            style={styles.refreshBtn}
          >
            <Feather
              name={isRefreshing ? "loader" : "refresh-cw"}
              size={18}
              color={colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={() => refetch()} tintColor={colors.primary} />
        }
      >
        <HealthScore score={healthScore} label={healthLabel} />

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total Spent"
              value={`₹${spendingSummary.totalSpent.toLocaleString("en-IN")}`}
              icon="arrow-down-left"
              color={colors.error}
            />
            <MetricCard
              label="Total Income"
              value={`₹${spendingSummary.totalIncome.toLocaleString("en-IN")}`}
              icon="arrow-up-right"
              color={colors.success}
            />
            <MetricCard
              label="Avg/Day"
              value={`₹${Math.round(spendingSummary.averageDailySpend).toLocaleString("en-IN")}`}
              icon="clock"
              color={colors.primary}
            />
            <MetricCard
              label="Savings Rate"
              value={
                spendingSummary.totalIncome > 0
                  ? `${Math.round(
                      ((spendingSummary.totalIncome - spendingSummary.totalSpent) /
                        spendingSummary.totalIncome) *
                        100,
                    )}%`
                  : "0%"
              }
              icon="trending-up"
              color="#AE431E"
            />
          </View>
        </Animated.View>

        {(budgetRecommendations.length > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <SectionHeader title="Budget Tracker" count={budgetRecommendations.length} />
            <View style={styles.budgetSection}>
              {budgetRecommendations.map((b) => (
                <BudgetBar
                  key={b.category}
                  label={b.category}
                  spent={b.spent}
                  limit={b.limit}
                  percentage={b.percentage}
                  status={b.status}
                />
              ))}
            </View>
          </Animated.View>
        )}

        {(subscriptions.length > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(400)}>
            <SectionHeader title="Detected Subscriptions" />
            <View style={[styles.subSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {subscriptions.map((sub) => (
                <SubscriptionRow
                  key={sub.name}
                  name={sub.name}
                  amount={sub.amount}
                  cycle={sub.cycle}
                  color={sub.name === "Netflix" ? "#E50914" : sub.name === "Hotstar" ? "#00AAFF" : sub.name === "Spotify" ? "#1DB954" : "#AE431E"}
                />
              ))}
              <View style={styles.subTotal}>
                <Text style={[styles.subTotalLabel, { color: colors.mutedForeground }]}>
                  Monthly Total
                </Text>
                <Text style={[styles.subTotalAmount, { color: colors.text }]}>
                  ₹{totalSubscriptions.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {(monthlyTrends.length > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <SectionHeader title="Monthly Trends" />
            <View style={[styles.trendSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {(Array.isArray(monthlyTrends) ? monthlyTrends : []).map((t) => (
                <TrendRow key={t.month} {...t} />
              ))}
            </View>
          </Animated.View>
        )}

        {(recommendations.length > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <SectionHeader title="AI Recommendations" count={recommendations.length} />
            <View style={styles.recSection}>
              {recommendations.map((r, idx) => (
                <RecommendationCard key={`${r.title}-${idx}`} {...r} />
              ))}
            </View>
          </Animated.View>
        )}

        {(unusualTransactions.length > 0) && (
          <Animated.View entering={FadeInDown.duration(500).delay(700)}>
            <SectionHeader title="Unusual Activity" count={unusualTransactions.length} />
            <View style={styles.anomalySection}>
              {unusualTransactions.slice(0, 3).map((u) => (
                <AnomalyRow key={u.transactionId} {...u} />
              ))}
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.duration(500).delay(800)}>
          <View style={styles.footerNote}>
            <Feather name={data.provider === "llm" ? "cpu" : "database"} size={14} color={colors.mutedForeground} />
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>
              Insights generated {data.provider === "llm" ? "by AI" : "from your data locally"}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  refreshBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, gap: 16 },

  healthContainer: { alignItems: "center", paddingVertical: 8 },
  healthRing: { position: "relative", width: 160, height: 160, justifyContent: "center", alignItems: "center" },
  healthCircleBg: { position: "absolute", borderWidth: 10, borderColor: "#81C784" },
  healthInner: { alignItems: "center" },
  healthScoreNum: { fontSize: 44, fontWeight: "900" },
  healthScoreLabel: { fontSize: 13, fontWeight: "700", marginTop: -2 },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  metricIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  metricValue: { fontSize: 20, fontWeight: "800" },
  metricLabel: { fontSize: 12, fontWeight: "600" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  sectionCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  sectionCountText: { fontSize: 12, fontWeight: "700" },

  budgetSection: { gap: 12 },
  budgetRow: { gap: 6 },
  budgetHeader: { flexDirection: "row", justifyContent: "space-between" },
  budgetCategory: { fontSize: 14, fontWeight: "700" },
  budgetAmount: { fontSize: 13, fontWeight: "600" },
  budgetBarBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  budgetBarFill: { height: "100%", borderRadius: 4 },
  budgetPercent: { fontSize: 11, fontWeight: "600" },

  subSection: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  subDot: { width: 8, height: 8, borderRadius: 4 },
  subInfo: { flex: 1 },
  subName: { fontSize: 14, fontWeight: "700" },
  subCycle: { fontSize: 11, fontWeight: "600", marginTop: 1 },
  subAmount: { fontSize: 15, fontWeight: "800" },
  subTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  subTotalLabel: { fontSize: 13, fontWeight: "700" },
  subTotalAmount: { fontSize: 15, fontWeight: "900" },

  trendSection: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    gap: 12,
  },
  trendMonth: { fontSize: 14, fontWeight: "700", width: 65 },
  trendNumbers: { flex: 1, flexDirection: "row", gap: 8 },
  trendPositive: { fontSize: 13, fontWeight: "700" },
  trendNegative: { fontSize: 13, fontWeight: "700" },
  trendCategory: { fontSize: 11, fontWeight: "600", width: 80, textAlign: "right" },

  recSection: { gap: 10 },
  recCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  recHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  recIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  recInfo: { flex: 1 },
  recTitle: { fontSize: 15, fontWeight: "700" },
  recSaving: { fontSize: 13, fontWeight: "700", marginTop: 1 },
  recBody: { fontSize: 13, lineHeight: 19 },

  anomalySection: { gap: 10 },
  anomalyCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  anomalyHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  anomalyBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  anomalyBadgeText: { fontSize: 11, fontWeight: "700" },
  anomalyAmount: { fontSize: 18, fontWeight: "800" },
  anomalyMerchant: { fontSize: 14, fontWeight: "700", marginTop: 4 },
  anomalyCategory: { fontSize: 12, fontWeight: "600" },
  anomalyReason: { fontSize: 12, lineHeight: 17, marginTop: 4 },

  footerNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
  },
  footerText: { fontSize: 12, fontWeight: "600" },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { fontSize: 15, fontWeight: "600" },

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  errorIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  errorTitle: { fontSize: 20, fontWeight: "800" },
  errorMessage: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  retryBtn: { borderRadius: 16, overflow: "hidden", marginTop: 8 },
  retryBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  retryBtnText: { fontSize: 16, fontWeight: "700" },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontWeight: "800" },
  emptyMessage: { fontSize: 14, textAlign: "center", lineHeight: 20 },
});
