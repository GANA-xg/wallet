import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BalanceWidget } from "@/components/BalanceWidget";
import { GradientCard } from "@/components/GradientCard";
import { QuickActions } from "@/components/QuickActions";
import { SectionHeader } from "@/components/SectionHeader";
import { TransactionItem } from "@/components/TransactionItem";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string) {
  return name.split(" ")[0];
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { balance, upiLite, cards, transactions, unreadCount } = useWallet();
  const [refreshing, setRefreshing] = React.useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const recentTx = transactions.slice(0, 5);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>
            {greeting()},
          </Text>
          <Text style={[styles.name, { color: colors.text }]}>
            {user ? firstName(user.name) : "Aryan"} 👋
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: colors.surface }]}
          onPress={() => router.push("/notifications")}
        >
          <Feather name="bell" size={20} color={colors.text} />
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Balance */}
      <View style={styles.section}>
        <BalanceWidget balance={balance} upiLite={upiLite} />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <QuickActions />
      </View>

      {/* Cards Preview */}
      {cards.length > 0 && (
        <View style={styles.section}>
          <SectionHeader
            title="My Cards"
            actionLabel="See All"
            onAction={() => router.push("/(tabs)/cards")}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardsScroll}
          >
            {cards.slice(0, 3).map((card) => (
              <GradientCard key={card.id} card={card} style={styles.cardPreview} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* AI Insights Teaser */}
      <TouchableOpacity
        style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push("/ai-insights")}
        activeOpacity={0.8}
      >
        <View style={styles.aiLeft}>
          <View style={[styles.aiIcon, { backgroundColor: "#1a1a2e" }]}>
            <Feather name="cpu" size={20} color="#7C3AED" />
          </View>
          <View>
            <Text style={[styles.aiTitle, { color: colors.text }]}>AI Insights</Text>
            <Text style={[styles.aiSub, { color: colors.mutedForeground }]}>
              You spent 12% less this week
            </Text>
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Recent Transactions */}
      <View style={styles.section}>
        <SectionHeader
          title="Recent"
          actionLabel="See All"
          onAction={() => router.push("/(tabs)/transactions")}
        />
        <View style={[styles.txCard, { backgroundColor: colors.surface, borderRadius: 20 }]}>
          {recentTx.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: { fontSize: 14, fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "800", marginTop: 2 },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800" },
  section: { marginBottom: 28 },
  cardsScroll: { gap: 16, paddingBottom: 4 },
  cardPreview: { width: 300, height: 174 },
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  aiLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  aiTitle: { fontSize: 15, fontWeight: "700" },
  aiSub: { fontSize: 13, marginTop: 2 },
  txCard: { paddingHorizontal: 16, overflow: "hidden" },
});
