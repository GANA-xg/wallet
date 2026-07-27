import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import SubscriptionDetailSheet from "@/components/SubscriptionDetailSheet";
import { SectionHeader } from "@/components/SectionHeader";
import { Skeleton } from "@/components/Skeleton";
import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import * as api from "@/services/api";

// ─── Types ────────────────────────────────────────────

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
type Category = "all" | "apps" | "media" | "tools" | "bills" | "other";

// ─── Category Heuristic — client-side keyword matching ──
// Shared with components/SubscriptionDetailSheet.tsx

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  apps: ["apple", "google", "microsoft", "adobe", "notion", "figma", "slack", "zoom", "dropbox", "github", "vercel", "netlify", "1password", "bitwarden", "clickup", "miro", "atlassian", "jira"],
  media: ["spotify", "netflix", "youtube", "hotstar", "prime", "disney", "jio", "gaana", "wynk", "audible", "apple music", "hulu", "paramount", "hbo", "sony liv", "zee5", "mx player", "podcast", "music"],
  tools: ["chatgpt", "openai", "midjourney", "canva", "grammarly", "todoist", "trello", "asana", "linear", "cursor", "copilot", "replit", "ai", "pro"],
  bills: ["electricity", "water", "gas", "internet", "broadband", "jio fiber", "airtel", "vi", "bsnl", "insurance", "rent", "maintenance", "society"],
};

function classifyMerchant(merchantName: string): Exclude<Category, "all"> {
  const lower = merchantName.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category as Exclude<Category, "all">;
    }
  }
  return "other";
}

// ─── Filter configs ───────────────────────────────────

const FILTERS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "cancelled_by_user", label: "Cancelled" },
  { key: "ignored", label: "Ignored" },
];

const CATEGORIES: { key: Category; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "all", label: "All", icon: "layers" },
  { key: "apps", label: "Apps", icon: "grid" },
  { key: "media", label: "Media", icon: "play" },
  { key: "tools", label: "Tools", icon: "tool" },
  { key: "bills", label: "Bills", icon: "file-text" },
  { key: "other", label: "Other", icon: "more-horizontal" },
];

// ─── Helpers ──────────────────────────────────────────

function formatAmount(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatNextCharge(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysUntil(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function daysUntilLabel(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `${Math.ceil(days / 7)}w`;
  return `${Math.ceil(days / 30)}mo`;
}

function statusColor(status: string): string {
  switch (status) {
    case "active": return "#10B981";
    case "cancelled_by_user": return "#EF4444";
    case "ignored": return "#6B7280";
    default: return "#6B7280";
  }
}

function daysUntilColor(days: number | null): string {
  if (days === null) return "#6B7280";
  if (days <= 3) return "#EF4444";
  if (days <= 7) return "#B8860B";
  return "#10B981";
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "apps": return "#FF385C";
    case "media": return "#754F4D";
    case "tools": return "#2E7D32";
    case "bills": return "#B8860B";
    default: return "#6B7280";
  }
}

// ─── Screen ───────────────────────────────────────────

export default function SubscriptionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // State
  const [subscriptions, setSubscriptions] = useState<SubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<FilterTab>("all");

  // Fetch
  const fetchSubs = useCallback(async () => {
    try {
      const res = await api.getSubscriptions({ status: "all" });
      setSubscriptions(res.subscriptions || []);
    } catch {
      // silent
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

  // ─── Derived / computed values ──────────────────────

  const enrichedSubs = useMemo(() => {
    return subscriptions.map((s) => ({
      ...s,
      category: classifyMerchant(s.merchant),
    }));
  }, [subscriptions]);

  const monthlyTotal = enrichedSubs
    .filter((s) => s.status === "active" && s.cadence === "monthly")
    .reduce((sum, s) => sum + s.amount_paise, 0);

  const yearlyTotal = enrichedSubs
    .filter((s) => s.status === "active" && s.cadence === "yearly")
    .reduce((sum, s) => sum + s.amount_paise, 0);

  const effectiveMonthly = monthlyTotal + Math.round(yearlyTotal / 12);

  const dueThisWeekCount = useMemo(() => {
    return enrichedSubs.filter((s) => {
      if (s.status !== "active") return false;
      const d = daysUntil(s.next_charge_date);
      return d !== null && d >= 0 && d <= 7;
    }).length;
  }, [enrichedSubs]);

  const upcomingItems = useMemo(() => {
    return enrichedSubs
      .filter((s) => {
        if (s.status !== "active") return false;
        const d = daysUntil(s.next_charge_date);
        return d !== null && d >= 0;
      })
      .map((s) => ({ ...s, daysUntil: daysUntil(s.next_charge_date)! }))
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [enrichedSubs]);

  const categoryBreakdown = useMemo(() => {
    const result: Record<string, number> = { apps: 0, media: 0, tools: 0, bills: 0, other: 0 };
    for (const s of enrichedSubs) {
      if (s.status !== "active") continue;
      const monthlyEquivalent = s.cadence === "yearly" ? Math.round(s.amount_paise / 12) : s.amount_paise;
      result[s.category] = (result[s.category] || 0) + monthlyEquivalent;
    }
    return result;
  }, [enrichedSubs]);

  const filteredList = useMemo(() => {
    let list = enrichedSubs;
    if (activeStatusFilter !== "all") {
      list = list.filter((s) => s.status === activeStatusFilter);
    }
    if (activeCategory !== "all") {
      list = list.filter((s) => s.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((s) => s.merchant.toLowerCase().includes(q));
    }
    return list;
  }, [enrichedSubs, activeStatusFilter, activeCategory, searchQuery]);

  // ─── Render helpers ─────────────────────────────────

  const renderHeader = () => (
    <View style={{ marginBottom: spacing.md }}>
      {/* Search bar */}
      {searchVisible && (
        <Animated.View entering={FadeInDown.duration(200)}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search subscriptions..."
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
              selectionColor={colors.primary}
            />
            <TouchableOpacity onPress={() => { setSearchQuery(""); setSearchVisible(false); }}>
              <Feather name="x" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Hero summary card */}
      <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.heroTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>Monthly Spend</Text>
            <Text style={[styles.heroAmount, { color: colors.text }]}>{formatAmount(effectiveMonthly)}</Text>
          </View>
          {dueThisWeekCount > 0 && (
            <View style={[styles.dueBadge, { backgroundColor: "#B8860B20" }]}>
              <Feather name="alert-circle" size={12} color="#B8860B" />
              <Text style={[styles.dueBadgeText, { color: "#B8860B" }]}>
                {dueThisWeekCount} due this week
              </Text>
            </View>
          )}
        </View>

        {/* Category breakdown bars */}
        <View style={styles.categoryBreakdown}>
          {(["apps", "media", "tools", "bills", "other"] as const).map((cat) => {
            const amount = categoryBreakdown[cat] || 0;
            if (amount === 0) return null;
            const pct = effectiveMonthly > 0 ? (amount / effectiveMonthly) * 100 : 0;
            return (
              <View key={cat} style={styles.breakdownRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{cat}</Text>
                <View style={[styles.breakdownBarBg, { backgroundColor: colors.surfaceElevated }]}>
                  <View style={[styles.breakdownBarFill, { width: `${pct}%`, backgroundColor: categoryColor(cat) }]} />
                </View>
                <Text style={[styles.breakdownAmount, { color: colors.text }]}>{formatAmount(amount)}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Upcoming timeline */}
      {upcomingItems.length > 0 && (
        <>
          <SectionHeader title="Upcoming" actionLabel="See all" onAction={() => setActiveStatusFilter("active")} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timelineScroll}>
            {upcomingItems.map((item) => {
              const dColor = daysUntilColor(item.daysUntil);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.timelineCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleOpenSheet(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.timelineDot, { backgroundColor: dColor }]} />
                  <Text style={[styles.timelineMerchant, { color: colors.text }]} numberOfLines={1}>
                    {item.merchant}
                  </Text>
                  <Text style={[styles.timelineAmount, { color: colors.text }]}>
                    {formatAmount(item.amount_paise)}
                  </Text>
                  <View style={styles.timelineFooter}>
                    <Text style={[{ color: dColor, fontSize: 11, fontWeight: "700" }]}>
                      {daysUntilLabel(item.daysUntil)}
                    </Text>
                    <Text style={[{ color: colors.textTertiary, fontSize: 10, fontWeight: "500" }]}>
                      {formatNextCharge(item.next_charge_date)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Category tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[
              styles.categoryChip,
              {
                backgroundColor: activeCategory === cat.key ? colors.primary : colors.surface,
                borderColor: activeCategory === cat.key ? colors.primary : colors.border,
              },
            ]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setActiveCategory(cat.key); }}
            activeOpacity={0.7}
          >
            <Feather name={cat.icon} size={12} color={activeCategory === cat.key ? "#FFFFFF" : colors.textSecondary} />
            <Text style={[styles.categoryChipText, { color: activeCategory === cat.key ? "#FFFFFF" : colors.textSecondary }]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeStatusFilter === f.key ? colors.surfaceElevated : "transparent",
                borderColor: activeStatusFilter === f.key ? colors.border : "transparent",
              },
            ]}
            onPress={() => setActiveStatusFilter(f.key)}
            activeOpacity={0.7}
          >
            <View style={[styles.filterDot, { backgroundColor: f.key === "all" ? colors.textSecondary : statusColor(f.key) }]} />
            <Text style={[styles.filterChipText, { color: activeStatusFilter === f.key ? colors.text : colors.textTertiary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Section label */}
      <SectionHeader
        title={`${activeCategory === "all" ? "All" : activeCategory} subscriptions`}
        actionLabel={filteredList.length > 0 ? `${filteredList.length}` : undefined}
      />
    </View>
  );

  const renderItem = ({ item, index }: { item: SubItem & { category: Exclude<Category, "all"> }; index: number }) => {
    const days = daysUntil(item.next_charge_date);
    const dColor = daysUntilColor(days);
    const catColor = categoryColor(item.category);
    const StatusDotColor = statusColor(item.status);

    return (
      <Animated.View entering={FadeInDown.duration(300).delay(index * 60)}>
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => handleOpenSheet(item)}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardLeft}>
              <View style={[styles.statusDot, { backgroundColor: StatusDotColor }]} />
              <View style={styles.cardInfo}>
                <Text style={[styles.merchant, { color: colors.text }]} numberOfLines={1}>
                  {item.merchant}
                </Text>
                <View style={styles.cardMeta}>
                  <View style={[styles.cadencePill, { backgroundColor: colors.surfaceElevated }]}>
                    <Text style={[styles.cadencePillText, { color: item.cadence === "monthly" ? colors.primary : colors.textSecondary }]}>
                      {item.cadence === "monthly" ? "Monthly" : "Yearly"}
                    </Text>
                  </View>
                  <View style={[styles.categoryTag, { backgroundColor: catColor + "15" }]}>
                    <Text style={[styles.categoryTagText, { color: catColor }]}>{item.category}</Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.cardRight}>
              <Text style={[styles.amount, { color: colors.text }]}>{formatAmount(item.amount_paise)}</Text>
            </View>
          </View>
          {/* Bottom row: next charge + days remaining */}
          {item.status === "active" && days !== null && (
            <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
              <View style={styles.cardFooterLeft}>
                <Feather name="calendar" size={12} color={colors.textTertiary} />
                <Text style={[styles.nextDateText, { color: colors.textSecondary }]}>
                  {formatNextCharge(item.next_charge_date)}
                </Text>
              </View>
              <View style={[styles.daysLeftBadge, { backgroundColor: dColor + "15" }]}>
                <Text style={[styles.daysLeftText, { color: dColor }]}>
                  {days <= 0 ? "Due now" : `${days}d left`}
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfaceElevated }]}>
        <Feather name="repeat" size={36} color={colors.textTertiary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {searchQuery
          ? "No matching subscriptions"
          : activeStatusFilter === "all" && activeCategory === "all"
          ? "No subscriptions detected yet"
          : "No subscriptions in this view"}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
        {searchQuery
          ? "Try a different search term"
          : "Tap scan to detect recurring payments from your transactions"}
      </Text>
      {!searchQuery && activeStatusFilter === "all" && activeCategory === "all" && (
        <TouchableOpacity
          style={[styles.emptyCta, { backgroundColor: colors.primary }]}
          onPress={handleDetect}
          disabled={detecting}
        >
          <Feather name="scan" size={16} color="#FFFFFF" />
          <Text style={styles.emptyCtaText}>{detecting ? "Scanning..." : "Detect Subscriptions"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Loading state ──────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + spacing.lg }]}>
        <View style={styles.headerSection}>
          <Skeleton width={200} height={28} borderRadius={4} />
        </View>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Skeleton width={120} height={14} borderRadius={4} />
          <Skeleton width={160} height={32} borderRadius={4} style={{ marginTop: spacing.sm }} />
          <View style={{ marginTop: spacing.md }}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} width="100%" height={8} borderRadius={4} style={{ marginBottom: spacing.sm }} />
            ))}
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.md, marginBottom: spacing.lg, paddingHorizontal: spacing.base }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={140} height={100} borderRadius={radius.md} />
          ))}
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

  // ─── Main render ────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerSection, { paddingTop: topPad + spacing.lg }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Subscriptions</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSearchVisible(!searchVisible); }}
            >
              <Feather name={searchVisible ? "x" : "search"} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerIconBtn, { backgroundColor: colors.surfaceElevated }]}
              onPress={handleDetect}
              disabled={detecting}
            >
              <Feather name={detecting ? "refresh-cw" : "scan"} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* List */}
      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListHeaderComponent={renderHeader}
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

// ─── Styles ────────────────────────────────────────────

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
  headerActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero card
  heroCard: {
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: "800",
  },
  dueBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.sm,
  },
  dueBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBreakdown: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: "600",
    width: 48,
    textTransform: "capitalize",
  },
  breakdownBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },
  breakdownBarFill: {
    height: 6,
    borderRadius: 3,
  },
  breakdownAmount: {
    fontSize: 12,
    fontWeight: "700",
    width: 64,
    textAlign: "right",
  },

  // Timeline
  timelineScroll: {
    flexGrow: 0,
    marginBottom: spacing.base,
  },
  timelineCard: {
    width: 140,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  timelineMerchant: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.xs,
  },
  timelineAmount: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  timelineFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    padding: 0,
  },

  // Category tabs
  categoryBar: {
    flexGrow: 0,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Status filter chips
  filterBar: {
    flexGrow: 0,
    marginBottom: spacing.base,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginRight: spacing.sm,
    borderWidth: 1,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // List / cards
  listContent: {
    paddingHorizontal: spacing.base,
  },
  card: {
    padding: spacing.base,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  categoryTag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  categoryTagText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  cardRight: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 17,
    fontWeight: "800",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  nextDateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  daysLeftBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  daysLeftText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: spacing.xl,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.base,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: spacing.base,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
  },
  emptyCtaText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // Skeleton
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
