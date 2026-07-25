import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import SubscriptionDetailSheet from "@/components/SubscriptionDetailSheet";
import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import * as api from "@/services/api";

type SubItem = {
  id: string;
  merchant: string;
  amount_paise: number;
  cadence: "monthly" | "yearly";
  status: string;
  next_charge_date?: string | null;
  detected_from_txn_id?: string | null;
  createdAt?: string;
};

type FilterTab = "all" | "active" | "cancelled_by_user" | "ignored";

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "cancelled_by_user", label: "Cancelled" },
  { key: "ignored", label: "Ignored" },
];

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatNextCharge(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function SubscriptionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [subscriptions, setSubscriptions] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  const fetchSubs = useCallback(async () => {
    try {
      const res = await api.getSubscriptions({ status: "all" });
      setSubscriptions(res.subscriptions || []);
    } catch {
      // silent — leave existing data
    }
  }, []);

  useEffect(() => {
    (async () => {
      await fetchSubs();
      setLoading(false);
    })();
  }, [fetchSubs]);

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await fetchSubs();
    setRefreshing(false);
  };

  const handleDetect = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetecting(true);
    try {
      const res = await api.detectSubscriptions();
      await fetchSubs();
      if (res.detected > 0) {
        Alert.alert("Subscriptions Found", `${res.detected} new subscription${res.detected > 1 ? "s" : ""} detected.`);
      } else {
        Alert.alert("No Subscriptions Found", "No new recurring payments detected.");
      }
    } catch {
      Alert.alert("Detection Failed", "Could not scan for subscriptions. Please try again.");
    } finally {
      setDetecting(false);
    }
  };

  const handleOpenSheet = (sub: SubItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedSub(sub);
    setSheetVisible(true);
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const res = await api.updateSubscriptionStatus(id, status);
      if (res.subscription) {
        setSubscriptions((prev) =>
          prev.map((s) => (s.id === id ? { ...s, status: res.subscription.status } : s)),
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update subscription status.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSubscription(id);
      setSubscriptions((prev) => prev.filter((s) => s.id !== id));
      setSheetVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to remove subscription.");
    }
  };

  // Compute totals
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  const monthlyTotal = activeSubs
    .filter((s) => s.cadence === "monthly")
    .reduce((sum, s) => sum + s.amount_paise, 0);
  const yearlyTotal = activeSubs
    .filter((s) => s.cadence === "yearly")
    .reduce((sum, s) => sum + s.amount_paise, 0);

  // Filter list
  const filteredList =
    activeFilter === "all"
      ? subscriptions
      : subscriptions.filter((s) => s.status === activeFilter);

  // Status indicator
  const statusIndicator = (status: string) => {
    switch (status) {
      case "active":
        return { color: "#10B981", label: "Active" };
      case "cancelled_by_user":
        return { color: "#EF4444", label: "Cancelled" };
      case "ignored":
        return { color: "#6B7280", label: "Ignored" };
      default:
        return { color: "#6B7280", label: status };
    }
  };

  const renderItem = ({ item, index }: { item: SubItem; index: number }) => {
    const status = statusIndicator(item.status);
    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleOpenSheet(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardLeft}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <View style={styles.cardInfo}>
              <Text style={[styles.merchant, { color: colors.text }]} numberOfLines={1}>
                {item.merchant}
              </Text>
              <View style={styles.cardMeta}>
                <View style={[styles.cadencePill, { backgroundColor: colors.surfaceElevated }]}>
                  <Text style={[styles.cadencePillText, { color: item.cadence === "monthly" ? colors.primary : colors.mutedForeground }]}>
                    {item.cadence === "monthly" ? "Monthly" : "Yearly"}
                  </Text>
                </View>
                <Text style={[styles.nextDate, { color: colors.mutedForeground }]}>
                  Next: {formatNextCharge(item.next_charge_date)}
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.amount, { color: colors.text }]}>
              {formatAmount(item.amount_paise)}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <Feather name="repeat" size={48} color={colors.mutedForeground} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {activeFilter === "all" ? "No subscriptions detected yet" : `No ${FILTERS.find((f) => f.key === activeFilter)?.label.toLowerCase()} subscriptions`}
      </Text>
      {activeFilter === "all" && (
        <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
          Tap "Detect New" after making a few payments
        </Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + spacing.lg }]}>
        <View style={styles.headerSection}>
          <Skeleton width={200} height={28} borderRadius={4} />
          <View style={styles.summaryRow}>
            <Skeleton width="45%" height={64} borderRadius={radius.md} />
            <Skeleton width="45%" height={64} borderRadius={radius.md} />
          </View>
        </View>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.skeletonCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Skeleton width={36} height={36} borderRadius={18} />
            <View style={{ flex: 1 }}>
              <Skeleton width="60%" height={14} borderRadius={4} />
              <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 6 }} />
            </View>
            <Skeleton width={80} height={20} borderRadius={4} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerSection, { paddingTop: topPad + spacing.lg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Subscriptions</Text>
          <TouchableOpacity
            style={[styles.detectBtn, { backgroundColor: colors.primary }]}
            onPress={handleDetect}
            disabled={detecting}
          >
            <Feather name="search" size={14} color="#FFFFFF" />
            <Text style={styles.detectBtnText}>
              {detecting ? "Scanning…" : "Detect New"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Summary cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Monthly</Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>
              {formatAmount(monthlyTotal)}
            </Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Yearly</Text>
            <Text style={[styles.summaryAmount, { color: colors.text }]}>
              {formatAmount(yearlyTotal)}
            </Text>
          </View>
        </View>

        {/* Filter bar */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: activeFilter === f.key ? colors.primary : colors.surface,
                  borderColor: activeFilter === f.key ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  { color: activeFilter === f.key ? "#FFFFFF" : colors.textSecondary },
                ]}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Detail sheet */}
      <SubscriptionDetailSheet
        visible={sheetVisible}
        subscription={selectedSub}
        onClose={() => setSheetVisible(false)}
        onUpdateStatus={handleUpdateStatus}
        onDelete={handleDelete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSection: {
    paddingHorizontal: spacing.base,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.base,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  detectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  detectBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: "800",
  },
  filterBar: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardInfo: {
    flex: 1,
  },
  merchant: {
    fontSize: 15,
    fontWeight: "700",
    textTransform: "capitalize",
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cadencePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  cadencePillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  nextDate: {
    fontSize: 11,
    fontWeight: "500",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: spacing.base,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: spacing.sm,
    textAlign: "center",
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
    marginHorizontal: spacing.base,
  },
});
