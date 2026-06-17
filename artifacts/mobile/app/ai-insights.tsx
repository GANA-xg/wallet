import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const SUBSCRIPTIONS = [
  { name: "Netflix", amount: 499, cycle: "Monthly", color: "#E50914" },
  { name: "Hotstar", amount: 749, cycle: "Monthly", color: "#00AAFF" },
  { name: "Spotify", amount: 119, cycle: "Monthly", color: "#1DB954" },
];

const SUGGESTIONS = [
  {
    icon: "trending-down" as const,
    title: "Cut Food Delivery",
    body: "You spent ₹2,100 on food delivery this month. Cook at home 2x/week to save ₹800/month.",
    saving: "₹800/mo",
    color: "#EF4444",
  },
  {
    icon: "refresh-cw" as const,
    title: "Auto-invest ₹5,000",
    body: "You have consistent surplus at month-end. Auto-invest in index funds for long-term growth.",
    saving: "12% returns",
    color: "#22C55E",
  },
  {
    icon: "credit-card" as const,
    title: "Switch Card for Shopping",
    body: "Use your HDFC Regalia for Amazon purchases to earn 3.3% cashback instead of 1%.",
    saving: "₹300/mo",
    color: "#3B82F6",
  },
];

function HealthScore({ score }: { score: number }) {
  const colors = useColors();
  const color = score >= 80 ? "#22C55E" : score >= 60 ? "#F59E0B" : "#EF4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : "Needs Work";

  return (
    <LinearGradient colors={["#171A21", "#1E2128"]} style={styles.scoreCard}>
      <View style={styles.scoreLeft}>
        <Text style={[styles.scoreTitle, { color: colors.text }]}>Financial Health</Text>
        <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Based on your spending</Text>
      </View>
      <View style={styles.scoreRight}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={[styles.scoreStatus, { color }]}>{label}</Text>
      </View>
    </LinearGradient>
  );
}

function SpendingBar({ category, spent, limit, color }: { category: string; spent: number; limit: number; color: string }) {
  const colors = useColors();
  const pct = Math.min((spent / limit) * 100, 100);
  const overBudget = spent > limit;

  return (
    <View style={styles.barRow}>
      <View style={styles.barLeft}>
        <Text style={[styles.barCategory, { color: colors.text }]}>{category}</Text>
        <Text style={[styles.barAmount, { color: overBudget ? colors.error : colors.mutedForeground }]}>
          ₹{spent.toLocaleString("en-IN")} / ₹{limit.toLocaleString("en-IN")}
        </Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.barFill,
            { width: `${pct}%` as unknown as number, backgroundColor: overBudget ? "#EF4444" : color },
          ]}
        />
      </View>
    </View>
  );
}

export default function AIInsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { budgets, transactions } = useWallet();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const totalSpent = transactions
    .filter((t) => t.type === "debit")
    .reduce((s, t) => s + t.amount, 0);

  const totalSubs = SUBSCRIPTIONS.reduce((s, sub) => s + sub.amount, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>AI Insights</Text>
        <View style={{ width: 22 }} />
      </View>

      <HealthScore score={78} />

      {/* Monthly Summary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>June Summary</Text>
        <View style={styles.summaryGrid}>
          {[
            { label: "Total Spent", value: `₹${totalSpent.toLocaleString("en-IN")}`, icon: "arrow-up-right" as const, color: "#EF4444" },
            { label: "Subscriptions", value: `₹${totalSubs}`, icon: "refresh-cw" as const, color: "#F59E0B" },
            { label: "Avg/Day", value: `₹${Math.round(totalSpent / 17).toLocaleString("en-IN")}`, icon: "calendar" as const, color: "#3B82F6" },
            { label: "Savings Rate", value: "23%", icon: "trending-up" as const, color: "#22C55E" },
          ].map((item, i) => (
            <View key={i} style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
              <View style={[styles.summaryIcon, { backgroundColor: item.color + "20" }]}>
                <Feather name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{item.value}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Budget Tracker */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Budget Tracker</Text>
        <View style={[styles.budgetCard, { backgroundColor: colors.surface }]}>
          {budgets.map((b) => (
            <SpendingBar
              key={b.id}
              category={b.category}
              spent={b.spent}
              limit={b.limit}
              color={b.color}
            />
          ))}
        </View>
      </View>

      {/* Subscriptions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Detected Subscriptions</Text>
        <View style={[styles.subsList, { backgroundColor: colors.surface }]}>
          {SUBSCRIPTIONS.map((sub, i) => (
            <View
              key={sub.name}
              style={[
                styles.subRow,
                { borderBottomColor: colors.border },
                i === SUBSCRIPTIONS.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <View style={[styles.subIcon, { backgroundColor: sub.color + "20" }]}>
                <Feather name="refresh-cw" size={14} color={sub.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.subName, { color: colors.text }]}>{sub.name}</Text>
                <Text style={[styles.subCycle, { color: colors.mutedForeground }]}>{sub.cycle}</Text>
              </View>
              <Text style={[styles.subAmount, { color: colors.text }]}>₹{sub.amount}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Suggestions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>AI Recommendations</Text>
        <View style={styles.suggestions}>
          {SUGGESTIONS.map((s, i) => (
            <View key={i} style={[styles.suggCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.suggHeader}>
                <View style={[styles.suggIcon, { backgroundColor: s.color + "20" }]}>
                  <Feather name={s.icon} size={18} color={s.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.suggTitle, { color: colors.text }]}>{s.title}</Text>
                  <View style={[styles.savingBadge, { backgroundColor: s.color + "20" }]}>
                    <Text style={[styles.savingText, { color: s.color }]}>{s.saving}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.suggBody, { color: colors.mutedForeground }]}>{s.body}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  scoreCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  scoreLeft: { gap: 4 },
  scoreTitle: { fontSize: 18, fontWeight: "700" },
  scoreLabel: { fontSize: 13 },
  scoreRight: { alignItems: "center" },
  scoreNumber: { fontSize: 44, fontWeight: "900" },
  scoreStatus: { fontSize: 14, fontWeight: "700" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    gap: 6,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryValue: { fontSize: 18, fontWeight: "800", marginTop: 4 },
  summaryLabel: { fontSize: 12 },
  budgetCard: { borderRadius: 16, padding: 16, gap: 16 },
  barRow: { gap: 6 },
  barLeft: { flexDirection: "row", justifyContent: "space-between" },
  barCategory: { fontSize: 14, fontWeight: "600" },
  barAmount: { fontSize: 13 },
  barTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  subsList: { borderRadius: 16, overflow: "hidden" },
  subRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  subName: { fontSize: 14, fontWeight: "600" },
  subCycle: { fontSize: 12, marginTop: 2 },
  subAmount: { fontSize: 15, fontWeight: "700" },
  suggestions: { gap: 12 },
  suggCard: { borderRadius: 16, padding: 16, gap: 12, borderWidth: 1 },
  suggHeader: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  suggIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  suggTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  savingBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  savingText: { fontSize: 12, fontWeight: "700" },
  suggBody: { fontSize: 14, lineHeight: 20 },
});
