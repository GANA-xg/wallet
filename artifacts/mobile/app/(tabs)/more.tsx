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
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const FEATURES = [
  { icon: "file-text" as const, label: "Documents", sub: "ID & papers", route: "/documents", color: "#D06224" },
  { icon: "tag" as const, label: "Tickets", sub: "Travel & events", route: "/tickets", color: "#AE431E" },
  { icon: "gift" as const, label: "Rewards", sub: "Points & offers", route: "/rewards", color: "#EAC891" },
  { icon: "cpu" as const, label: "AI Insights", sub: "Smart analysis", route: "/ai-insights", color: "#D06224" },
  { icon: "map" as const, label: "Transport", sub: "Metro & Bus", route: "/transport", color: "#2E7D32" },
  { icon: "wifi" as const, label: "NFC Pay", sub: "Tap to pay", route: "/nfc-pay", color: "#AE431E" },
  { icon: "bell" as const, label: "Alerts", sub: "Notifications", route: "/notifications", color: "#D06224" },
  { icon: "shield" as const, label: "Security", sub: "Protect account", route: "/security", color: "#2E7D32" },
];

const SETTINGS_ITEMS = [
  { icon: "user" as const, label: "Profile", route: "/profile" },
  { icon: "settings" as const, label: "Settings", route: "/settings" },
  { icon: "help-circle" as const, label: "Help & Support", route: "/settings" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { unreadCount, rewards, transportPasses } = useWallet();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleLogout = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    logout();
    router.replace("/(auth)/onboarding");
  };

  const totalPoints = rewards.find((r) => r.type === "points")?.points ?? 0;
  const totalTransportBalance = transportPasses.reduce((s, tp) => s + tp.balance, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* User Banner */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <TouchableOpacity
          style={[styles.userBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/profile");
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.name.split(" ").map((n) => n[0]).join("") ?? "AS"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>{user?.name ?? "Aryan Sharma"}</Text>
            <Text style={[styles.userPhone, { color: colors.mutedForeground }]}>
              +91 {user?.phone ?? "98765 43210"}
            </Text>
          </View>
          <View style={styles.badges}>
            {totalPoints > 0 && (
              <View style={[styles.pointsBadge, { backgroundColor: colors.sunset + "20" }]}>
                <Feather name="star" size={10} color={colors.sunsetDark} />
                <Text style={[styles.pointsText, { color: colors.sunsetDark }]}>{totalPoints.toLocaleString("en-IN")}</Text>
              </View>
            )}
            {totalTransportBalance > 0 && (
              <View style={[styles.transportBadge, { backgroundColor: colors.successLight + "20" }]}>
                <Feather name="map" size={10} color={colors.success} />
                <Text style={[styles.transportBadgeText, { color: colors.success }]}>
                  ₹{totalTransportBalance}
                </Text>
              </View>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>

      {/* Feature Grid */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
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
              <View style={[styles.featureIcon, { backgroundColor: feat.color + "15" }]}>
                <Feather name={feat.icon} size={20} color={feat.color} />
                {feat.label === "Alerts" && unreadCount > 0 && (
                  <View style={[styles.notifDot, { backgroundColor: colors.error }]} />
                )}
              </View>
              <Text style={[styles.featureLabel, { color: colors.text }]}>{feat.label}</Text>
              <Text style={[styles.featureSub, { color: colors.mutedForeground }]}>{feat.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Settings */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
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
              <View style={[styles.settingsIcon, { backgroundColor: colors.surfaceElevated }]}>
                <Feather name={item.icon} size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>{item.label}</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Logout */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <TouchableOpacity
          style={[styles.logoutBtn, { borderColor: colors.border }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Feather name="log-out" size={16} color={colors.error} />
          <Text style={[styles.logoutText, { color: colors.error }]}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textTertiary }]}>Vault v1.0.0</Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  userBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 18, borderWidth: 1, marginBottom: 24,
  },
  avatar: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFFDF9", fontSize: 16, fontWeight: "800" },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: "700" },
  userPhone: { fontSize: 12, marginTop: 2 },
  badges: { flexDirection: "row", gap: 6, alignItems: "center" },
  pointsBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  pointsText: { fontSize: 11, fontWeight: "700" },
  transportBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6,
  },
  transportBadgeText: { fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  featureCard: { width: "47.5%", padding: 14, borderRadius: 18, borderWidth: 1, gap: 6 },
  featureIcon: {
    width: 44, height: 44, borderRadius: 12,
    justifyContent: "center", alignItems: "center", position: "relative",
  },
  notifDot: { position: "absolute", top: 4, right: 4, width: 8, height: 8, borderRadius: 4 },
  featureLabel: { fontSize: 14, fontWeight: "700" },
  featureSub: { fontSize: 11 },
  settingsCard: { borderRadius: 18, overflow: "hidden", marginBottom: 16 },
  settingsRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lastRow: { borderBottomWidth: 0 },
  settingsIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  settingsLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderWidth: 1, borderRadius: 14, paddingVertical: 13, marginBottom: 16,
  },
  logoutText: { fontSize: 15, fontWeight: "700" },
  version: { textAlign: "center", fontSize: 11 },
});
