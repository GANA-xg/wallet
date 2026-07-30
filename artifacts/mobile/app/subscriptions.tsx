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
import { router } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";

import SubscriptionDetailSheet from "@/components/SubscriptionDetailSheet";
import { SectionHeader } from "@/components/SectionHeader";
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
type Category = "all" | "apps" | "media" | "tools" | "bills" | "other";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<FilterTab>("all");
  const [isEmailConnected, setIsEmailConnected] = useState(false);

  const fetchSubs = useCallback(async () => {
    try {
      const res = await api.getSubscriptions({ status: "all" });
      setSubscriptions(res.subscriptions || []);
      if (res.subscriptions && res.subscriptions.length > 0) {
        setIsEmailConnected(true);
      }
    } catch {}
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

  const handleConnectEmail = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetecting(true);
    try {
      // Mock / trigger subscription scanning
      const res = await api.detectSubscriptions();
      await fetchSubs();
      setIsEmailConnected(true);
      if (res.detected > 0) {
        Alert.alert("Email Connected", `${res.detected} subscriptions detected successfully!`);
      } else {
        Alert.alert("Connected", "Connected to email. No subscriptions found yet.");
      }
    } catch {
      Alert.alert("Connection Failed", "Could not connect. Please try again.");
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
      Alert.alert("Error", "Failed to update status.");
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

  const enrichedSubs = useMemo(() => {
    return subscriptions.map((s) => ({
      ...s,
      category: classifyMerchant(s.merchant),
    }));
  }, [subscriptions]);

  const activeSubs = useMemo(() => enrichedSubs.filter((s) => s.status === "active"), [enrichedSubs]);

  const effectiveMonthly = useMemo(() => {
    return activeSubs.reduce((sum, s) => {
      const val = s.amount_paise || 0;
      return sum + (s.cadence === "yearly" ? Math.round(val / 12) : val);
    }, 0);
  }, [activeSubs]);

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

  const renderHeader = () => (
    <View style={{ marginBottom: spacing.md }}>
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + spacing.lg }]}>
        <View style={styles.headerSection}>
          <Skeleton width={200} height={28} borderRadius={4} />
        </View>
      </View>
    );
  }

  // ─── Render Marketing Screen (Mockup) ───
  if (!isEmailConnected) {
    return (
      <View style={[styles.mContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.mHeader, { paddingTop: topPad + spacing.lg }]}>
          <Text style={[styles.mTitle, { color: colors.text }]}>Bills & Subscriptions</Text>
          <View style={styles.mHeaderRight}>
            <TouchableOpacity style={styles.mIconBtn}>
              <Feather name="zap" size={16} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.mIconBtn} onPress={() => router.push("/settings")}>
              <Feather name="settings" size={16} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Brand icons horizontal list */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.logoScroll} contentContainerStyle={styles.logoScrollContent}>
          {[
            { icon: "slack", color: "#4A154B" },
            { icon: "cpu", color: "#10a37f" }, // ChatGPT style green
            { icon: "plus", color: "#FF385C" },
            { icon: "youtube", color: "#FF0000" },
            { icon: "phone", color: "#3B82F6" },
            { icon: "video", color: "#00A8E1" }, // Prime style blue
            { icon: "book", color: "#000000" },
          ].map((item, idx) => (
            <View key={idx} style={[styles.logoBubble, { backgroundColor: colors.surfaceElevated }]}>
              <Feather name={item.icon as any} size={28} color={item.color} />
            </View>
          ))}
        </ScrollView>

        {/* Marketing summary */}
        <View style={styles.mBody}>
          <Text style={[styles.mSubTitle, { color: colors.text }]}>
            Never get surprised by a recurring charge again.
          </Text>
          <Text style={[styles.mText, { color: colors.textSecondary }]}>
            Connect your email and we line up every bill and subscription from{" "}
            <Text style={{ fontWeight: "700" }}>Play Store</Text> or{" "}
            <Text style={{ fontWeight: "700" }}>App Store</Text>, with reminders before they renew. No spreadsheets, no manual tracking.
          </Text>

          {/* Action button */}
          <TouchableOpacity
            style={[styles.mButton, { backgroundColor: colors.primary }]}
            onPress={handleConnectEmail}
            disabled={detecting}
          >
            <Text style={styles.mButtonText}>
              {detecting ? "Connecting..." : "Connect email"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer spacing for tabs */}
        <View style={{ height: 100 }} />
      </View>
    );
  }

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
          onPress={handleConnectEmail}
          disabled={detecting}
        >
          <Feather name="maximize" size={16} color="#FFFFFF" />
          <Text style={styles.emptyCtaText}>{detecting ? "Scanning..." : "Detect Subscriptions"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ─── Main list render ──────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              onPress={handleConnectEmail}
              disabled={detecting}
            >
              <Feather name={detecting ? "refresh-cw" : "maximize"} size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredList}
        keyExtractor={(item) => item.id}
        renderItem={renderItem as any}
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
  container: { flex: 1 },
  headerSection: { paddingHorizontal: spacing.base, paddingBottom: spacing.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.base },
  title: { fontSize: 24, fontWeight: "800" },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  headerIconBtn: { width: 40, height: 40, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  searchContainer: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.base, height: 44, marginBottom: spacing.base },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 8 },
  heroCard: { padding: spacing.base, borderRadius: radius.lg, borderWidth: 1, marginBottom: spacing.base },
  heroTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: spacing.base },
  heroLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: spacing.xs },
  heroAmount: { fontSize: 28, fontWeight: "800" },
  dueBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs + 2, borderRadius: radius.sm },
  dueBadgeText: { fontSize: 11, fontWeight: "700" },
  categoryBreakdown: { gap: spacing.sm },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  breakdownLabel: { fontSize: 11, fontWeight: "600", width: 48, textTransform: "capitalize" },
  breakdownBarBg: { flex: 1, height: 6, borderRadius: 3 },
  breakdownBarFill: { height: 6, borderRadius: 3 },
  breakdownAmount: { fontSize: 12, fontWeight: "700", width: 64, textAlign: "right" },
  timelineScroll: { flexGrow: 0, marginBottom: spacing.base },
  timelineCard: { width: 140, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, marginRight: spacing.sm },
  timelineDot: { width: 8, height: 8, borderRadius: 4, marginBottom: spacing.sm },
  timelineMerchant: { fontSize: 13, fontWeight: "700", marginBottom: spacing.xs },
  timelineAmount: { fontSize: 15, fontWeight: "800", marginBottom: spacing.sm },
  timelineFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  categoryBar: { flexGrow: 0, marginBottom: spacing.sm, paddingHorizontal: spacing.base },
  categoryChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, marginRight: spacing.sm },
  categoryChipText: { fontSize: 13, fontWeight: "700" },
  filterBar: { flexGrow: 0, marginBottom: spacing.base, paddingHorizontal: spacing.base },
  filterChip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, borderRadius: radius.full, borderWidth: 1, marginRight: spacing.sm },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterChipText: { fontSize: 13, fontWeight: "700" },
  listContent: { paddingHorizontal: spacing.base, paddingTop: spacing.sm },
  card: { padding: spacing.base, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.md },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  cardInfo: { flex: 1 },
  merchant: { fontSize: 15, fontWeight: "700", textTransform: "capitalize", marginBottom: 4 },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  cadencePill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  cadencePillText: { fontSize: 10, fontWeight: "700" },
  categoryTag: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  categoryTagText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  cardRight: { alignItems: "flex-end" },
  amount: { fontSize: 17, fontWeight: "800" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md, paddingTop: spacing.sm, borderWidth: 0, borderTopWidth: StyleSheet.hairlineWidth },
  cardFooterLeft: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  nextDateText: { fontSize: 12, fontWeight: "500" },
  daysLeftBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  daysLeftText: { fontSize: 10, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: spacing.base },
  emptyTitle: { fontSize: 16, fontWeight: "700", marginBottom: spacing.sm },
  emptySubtext: { fontSize: 13, fontWeight: "500", textAlign: "center", paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  emptyCta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.base, paddingVertical: spacing.sm + 2, borderRadius: radius.md },
  emptyCtaText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  skeletonCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.base, borderRadius: radius.md, borderWidth: 1, marginBottom: spacing.sm, marginHorizontal: spacing.base },

  // Marketing Layout (Mockup)
  mContainer: { flex: 1, paddingHorizontal: spacing.base },
  mHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.xl + 20 },
  mTitle: { fontSize: 26, fontWeight: "800" },
  mHeaderRight: { flexDirection: "row", gap: spacing.sm },
  mIconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  logoScroll: { flexGrow: 0, marginBottom: spacing.xl + 20 },
  logoScrollContent: { gap: spacing.md, paddingHorizontal: spacing.sm },
  logoBubble: { width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  mBody: { paddingHorizontal: spacing.base, gap: spacing.base },
  mSubTitle: { fontSize: 24, fontWeight: "800", lineHeight: 32 },
  mText: { fontSize: 14, lineHeight: 22, fontWeight: "500" },
  mButton: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: spacing.base },
  mButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
