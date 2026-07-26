import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Skeleton, SkeletonBalance } from "@/components/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import iconSizes from "@/constants/icons";
import * as api from "@/services/api";

// Toggle this to compare fonts
const FONT_MODE = "geist" as "geist" | "inter";

const fonts = {
  geist: {
    regular: "Geist_400Regular",
    medium: "Geist_500Medium",
    semibold: "Geist_600SemiBold",
    bold: "Geist_700Bold",
    extrabold: "Geist_800ExtraBold",
  },
  inter: {
    regular: "Inter_400Regular",
    medium: "Inter_500Medium",
    semibold: "Inter_600SemiBold",
    bold: "Inter_700Bold",
    extrabold: "Inter_700Bold", // Inter doesn't have 800
  },
};

const f = fonts[FONT_MODE];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function firstName(name: string) {
  return name.split(" ")[0];
}

function formatBalance(n: number) {
  return n.toLocaleString("en-IN");
}

/** Quick actions — no gradients, solid green primary, clean secondary */
const PRIMARY_ACTIONS = [
  { id: "pay", label: "Scan & Pay", icon: "maximize" as const, route: "/pay" as const },
  { id: "send", label: "Send Money", icon: "send" as const, route: "/send" as const },
];

const SECONDARY_ACTIONS = [
  { id: "receive", label: "Receive", icon: "download" as const, route: "/receive" as const },
  { id: "bills", label: "Bills", icon: "file-text" as const, route: "/rewards" as const },
  { id: "recharge", label: "Recharge", icon: "smartphone" as const, route: "/rewards" as const },
];

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { balance, cards, upiLite, unreadCount } = useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [subsLoading, setSubsLoading] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    AsyncStorage.getItem("@vault_hide_balance").then((v: string | null) => {
      if (v === "true") setBalanceHidden(true);
    }).catch(() => {});
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getSubscriptions({ status: "active" });
        setSubscriptions(res.subscriptions ?? []);
      } catch {} finally {
        setSubsLoading(false);
      }
    })();
  }, []);

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => {
      setRefreshing(false);
      setLoading(false);
    }, 1200);
  };

  const monthlyTotal = (subscriptions ?? [])
    .filter((s: any) => s.cadence === "monthly")
    .reduce((sum: number, s: any) => sum + (s.amount_paise ?? 0), 0);
  const top3 = (subscriptions ?? [])
    .filter((s: any) => s.status === "active")
    .sort((a: any, b: any) => (b.amount_paise ?? 0) - (a.amount_paise ?? 0))
    .slice(0, 3);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topPad + spacing.lg,
          paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100,
        },
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
        />
      }
    >
      {/* ── HEADER ── */}
      <Animated.View entering={FadeInDown.duration(320).delay(50)}>
        <View style={styles.header}>
          <View>
            <Text
              style={[
                styles.greeting,
                { color: colors.textTertiary, fontFamily: f.medium },
              ]}
            >
              {greeting()},
            </Text>
            <Text
              style={[
                styles.name,
                { color: colors.text, fontFamily: f.bold },
              ]}
            >
              {user ? firstName(user.name) : "Aryan"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={[styles.iconBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/notifications");
              }}
            >
              <Feather name="bell" size={iconSizes.lg} color={colors.textSecondary} />
              {unreadCount > 0 && (
                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.badgeText, { fontFamily: f.semibold }]}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>
        </View>
      </Animated.View>

      {/* ── BALANCE ──
       * Important but not dominant.
       * Apple Wallet / Revolut / Monzo hierarchy.
       * No gradient card. Clean typography on background.
       */}
      <Animated.View entering={FadeInDown.duration(320).delay(100)}>
        <View style={styles.balanceSection}>
          {loading ? (
            <SkeletonBalance />
          ) : (
            <>
              <View style={styles.balanceTop}>
                <Text
                  style={[
                    styles.balanceLabel,
                    { color: colors.textTertiary, fontFamily: f.medium },
                  ]}
                >
                  Total Balance
                </Text>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setBalanceHidden(!balanceHidden);
                  }}
                  hitSlop={8}
                >
                  <Feather
                    name={balanceHidden ? "eye-off" : "eye"}
                    size={iconSizes.md}
                    color={colors.textTertiary}
                  />
                </Pressable>
              </View>

              <Text
                style={[
                  styles.balanceAmount,
                  { color: colors.text, fontFamily: f.extrabold },
                ]}
              >
                {balanceHidden ? "••••••" : `₹ ${formatBalance(balance)}`}
              </Text>

              {/* Subtle pills — UPI Lite and trend */}
              <View style={styles.balancePills}>
                {upiLite > 0 && (
                  <View style={[styles.pill, { backgroundColor: colors.surfaceElevated }]}>
                    <View style={[styles.pillDot, { backgroundColor: colors.success }]} />
                    <Text
                      style={[
                        styles.pillText,
                        { color: colors.textSecondary, fontFamily: f.medium },
                      ]}
                    >
                      UPI Lite {balanceHidden ? "••••" : `₹${formatBalance(upiLite)}`}
                    </Text>
                  </View>
                )}
                <View style={[styles.pill, { backgroundColor: colors.surfaceElevated }]}>
                  <Feather name="trending-up" size={iconSizes.badge} color={colors.success} />
                  <Text
                    style={[
                      styles.pillText,
                      { color: colors.textSecondary, fontFamily: f.medium },
                    ]}
                  >
                    +12.4%
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </Animated.View>

      {/* ── QUICK ACTIONS ──
       * No gradients. Solid green primary. Clean secondary.
       * Rounded-full pills, not rounded-2xl cards.
       */}
      <Animated.View entering={FadeInDown.duration(320).delay(200)}>
        <View style={styles.actionsSection}>
          {/* Primary row */}
          <View style={styles.primaryRow}>
            {PRIMARY_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(action.route as never);
                }}
              >
                <Feather name={action.icon} size={iconSizes.lg} color="#FFFFFF" />
                <Text style={[styles.primaryLabel, { color: "#FFFFFF", fontFamily: f.semibold }]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Secondary row */}
          <View style={styles.secondaryRow}>
            {SECONDARY_ACTIONS.map((action) => (
              <Pressable
                key={action.id}
                style={[styles.secondaryBtn, { backgroundColor: colors.surfaceElevated }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(action.route as never);
                }}
              >
                <Feather name={action.icon} size={iconSizes.md} color={colors.textSecondary} />
                <Text
                  style={[
                    styles.secondaryLabel,
                    { color: colors.textSecondary, fontFamily: f.medium },
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* ── SUBSCRIPTIONS SUMMARY ── */}
      <Animated.View entering={FadeInDown.duration(320).delay(300)}>
        <View style={styles.txSection}>
          <View style={styles.txHeader}>
            <Text style={[styles.txTitle, { color: colors.text, fontFamily: f.semibold }]}>
              Subscriptions
            </Text>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/subscriptions");
              }}
              hitSlop={8}
            >
              <Text style={[styles.txAction, { color: colors.primary, fontFamily: f.semibold }]}>
                View All
              </Text>
            </Pressable>
          </View>

          {subsLoading ? (
            <View>
              <Skeleton width="100%" height={80} borderRadius={radius.md} />
            </View>
          ) : subscriptions.length === 0 ? (
            <View style={[styles.subEmpty, { borderColor: colors.border }]}>
              <Feather name="repeat" size={32} color={colors.mutedForeground} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.subEmptyTitle, { color: colors.text }]}>
                  No subscriptions yet
                </Text>
                <Text style={[styles.subEmptySub, { color: colors.mutedForeground }]}>
                  Recurring payments will appear here
                </Text>
              </View>
            </View>
          ) : (
            <View>
              <View style={[styles.subTotalRow, { backgroundColor: colors.surfaceElevated }]}>
                <Text style={[styles.subTotalLabel, { color: colors.mutedForeground }]}>
                  Monthly total
                </Text>
                <Text style={[styles.subTotalAmount, { color: colors.text }]}>
                  ₹{(monthlyTotal / 100).toLocaleString("en-IN")}
                </Text>
              </View>
              {top3.map((sub: any) => (
                <View key={sub.id} style={styles.subRow}>
                  <View style={[styles.subDot, { backgroundColor: sub.status === "active" ? "#10B981" : "#6B7280" }]} />
                  <Text style={[styles.subName, { color: colors.text }]} numberOfLines={1}>
                    {sub.merchant}
                  </Text>
                  <Text style={[styles.subAmount, { color: colors.textSecondary }]}>
                    ₹{(sub.amount_paise / 100).toLocaleString("en-IN")}/mo
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </Animated.View>

      {/* ── CARDS STRIP (if any) ── */}
      {cards.length > 0 && (
        <Animated.View entering={FadeInDown.duration(320).delay(350)}>
          <View style={styles.cardsSection}>
            <View style={styles.txHeader}>
              <Text
                style={[
                  styles.txTitle,
                  { color: colors.text, fontFamily: f.semibold },
                ]}
              >
                My Cards
              </Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/cards");
                }}
                hitSlop={8}
              >
                <Text
                  style={[
                    styles.txAction,
                    { color: colors.primary, fontFamily: f.semibold },
                  ]}
                >
                  {cards.length > 1 ? `All ${cards.length}` : "Details"}
                </Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cardStrip}
              decelerationRate="fast"
              snapToInterval={280}
            >
              {cards.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/card-detail?id=${card.id}`);
                  }}
                >
                  <View
                    style={[
                      styles.cardThumb,
                      {
                        backgroundColor: card.theme?.gradientColors?.[0] ?? colors.surface,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={[styles.cardThumbIssuer, { fontFamily: f.medium }]}>
                      {card.issuer ?? "Card"}
                    </Text>
                    <Text style={[styles.cardThumbNumber, { fontFamily: f.regular }]}>
                      •••• {card.lastFour}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.base,
    gap: 0,
  },

  // ── Header ──
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  greeting: { fontSize: 14 },
  name: { fontSize: 26, marginTop: 2 },
  headerRight: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
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
  badgeText: { color: "#FFFFFF", fontSize: 9 },

  // ── Balance ──
  balanceSection: {
    marginBottom: spacing.xl,
  },
  balanceTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  balanceLabel: { fontSize: 12 },
  balanceAmount: {
    fontSize: 36,
    letterSpacing: -1,
    marginBottom: spacing.base,
  },
  balancePills: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  pillText: { fontSize: 12 },

  // ── Quick Actions ──
  actionsSection: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  primaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.full,
  },
  primaryLabel: { fontSize: 15 },
  secondaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.base,
    borderRadius: radius.full,
  },
  secondaryLabel: { fontSize: 11 },

  // ── Transactions ──
  txSection: {
    marginBottom: spacing.xl,
  },
  txHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  txTitle: { fontSize: 18 },
  txAction: { fontSize: 13 },

  // ── Subscriptions ──
  subEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  subEmptyTitle: { fontSize: 14, fontWeight: "700" },
  subEmptySub: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  subTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  subTotalLabel: { fontSize: 12, fontWeight: "600" },
  subTotalAmount: { fontSize: 18, fontWeight: "800" },
  subRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  subDot: { width: 8, height: 8, borderRadius: 4 },
  subName: { flex: 1, fontSize: 14, fontWeight: "600" },
  subAmount: { fontSize: 13, fontWeight: "700" },

  // ── Cards ──
  cardsSection: {
    marginBottom: spacing.xl,
  },
  cardStrip: { gap: spacing.md, paddingRight: spacing.base },
  cardThumb: {
    width: 200,
    height: 120,
    borderRadius: radius.lg,
    padding: spacing.base,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  cardThumbIssuer: { fontSize: 12, color: "#FFFFFF" },
  cardThumbNumber: { fontSize: 13, color: "rgba(255,255,255,0.7)", letterSpacing: 2 },
});
