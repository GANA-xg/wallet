import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const FEATURES = [
  {
    icon: "file-text" as const,
    label: "Documents",
    sub: "ID & papers",
    route: "/documents",
    color: "#3B82F6",
  },
  {
    icon: "tag" as const,
    label: "Tickets",
    sub: "Travel & events",
    route: "/tickets",
    color: "#8B5CF6",
  },
  {
    icon: "gift" as const,
    label: "Rewards",
    sub: "Points & offers",
    route: "/rewards",
    color: "#F59E0B",
  },
  {
    icon: "cpu" as const,
    label: "AI Insights",
    sub: "Smart analysis",
    route: "/ai-insights",
    color: "#7C3AED",
  },
  {
    icon: "bell" as const,
    label: "Notifications",
    sub: "Alerts",
    route: "/notifications",
    color: "#EF4444",
  },
  {
    icon: "shield" as const,
    label: "Security",
    sub: "Protect account",
    route: "/security",
    color: "#22C55E",
  },
];

const SETTINGS_ITEMS = [
  { icon: "user" as const, label: "Profile", route: "/profile" },
  { icon: "settings" as const, label: "Settings", route: "/settings" },
  { icon: "help-circle" as const, label: "Help & Support", route: "/settings" },
];

function firstName(name: string) {
  return name.split(" ")[0];
}

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { unreadCount, rewards } = useWallet();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    logout();
    router.replace("/(auth)/onboarding");
  };

  const totalPoints = rewards.find((r) => r.type === "points")?.points ?? 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* User Banner */}
      <TouchableOpacity
        style={[styles.userBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push("/profile")}
        activeOpacity={0.8}
      >
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.name
              .split(" ")
              .map((n) => n[0])
              .join("") ?? "AS"}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.name ?? "Aryan Sharma"}
          </Text>
          <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>
            +91 {user?.phone ?? "98765 43210"}
          </Text>
        </View>
        <View style={styles.pointsBadge}>
          <Feather name="star" size={12} color="#F59E0B" />
          <Text style={styles.pointsText}>{totalPoints.toLocaleString("en-IN")}</Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      {/* Feature Grid */}
      <View style={styles.grid}>
        {FEATURES.map((feat) => (
          <TouchableOpacity
            key={feat.route}
            style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(feat.route as never);
            }}
            activeOpacity={0.75}
          >
            <View style={[styles.featureIcon, { backgroundColor: feat.color + "20" }]}>
              <Feather name={feat.icon} size={22} color={feat.color} />
              {feat.label === "Notifications" && unreadCount > 0 && (
                <View style={styles.notifDot} />
              )}
            </View>
            <Text style={[styles.featureLabel, { color: colors.text }]}>{feat.label}</Text>
            <Text style={[styles.featureSub, { color: colors.mutedForeground }]}>{feat.sub}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings */}
      <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
        {SETTINGS_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={item.route + i}
            style={[
              styles.settingsRow,
              { borderBottomColor: colors.border },
              i === SETTINGS_ITEMS.length - 1 && styles.lastRow,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as never);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.settingsIcon, { backgroundColor: colors.muted }]}>
              <Feather name={item.icon} size={18} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: colors.border }]}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Feather name="log-out" size={18} color={colors.error} />
        <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textTertiary }]}>Vault v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  userBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: "700" },
  userPhone: { fontSize: 13, marginTop: 2 },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F59E0B20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointsText: { color: "#F59E0B", fontSize: 13, fontWeight: "700" },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  featureCard: {
    width: "47%",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  featureLabel: { fontSize: 15, fontWeight: "700" },
  featureSub: { fontSize: 12 },
  settingsCard: { borderRadius: 20, overflow: "hidden", marginBottom: 16 },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: { borderBottomWidth: 0 },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: { fontSize: 16, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 12 },
});
