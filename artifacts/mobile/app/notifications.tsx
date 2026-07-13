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

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { VaultNotification } from "@/types";

const TYPE_COLORS = {
  payment: "#22C55E",
  reward: "#F59E0B",
  security: "#EF4444",
  info: "#3B82F6",
};

const TYPE_ICONS: Record<VaultNotification["type"], keyof typeof Feather.glyphMap> = {
  payment: "send",
  reward: "gift",
  security: "shield",
  info: "info",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notifications, markRead } = useWallet();

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const unread = notifications.filter((n) => !n.read);
  const read = notifications.filter((n) => n.read);

  const handleMarkRead = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markRead(id);
  };

  const renderNotif = (n: VaultNotification) => {
    const typeColor = TYPE_COLORS[n.type];
    const icon = TYPE_ICONS[n.type];

    return (
      <TouchableOpacity
        key={n.id}
        style={[
          styles.notifRow,
          {
            backgroundColor: n.read ? colors.surface : colors.surfaceElevated,
            borderLeftColor: n.read ? "transparent" : typeColor,
          },
        ]}
        onPress={() => handleMarkRead(n.id)}
        activeOpacity={0.8}
      >
        <View style={[styles.iconWrap, { backgroundColor: typeColor + "20" }]}>
          <Feather name={icon} size={18} color={typeColor} />
        </View>
        <View style={styles.notifBody}>
          <View style={styles.notifTop}>
            <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>
              {n.title}
            </Text>
            {!n.read && <View style={[styles.dot, { backgroundColor: typeColor }]} />}
          </View>
          <Text style={[styles.notifText, { color: colors.mutedForeground }]} numberOfLines={2}>
            {n.body}
          </Text>
          <Text style={[styles.notifTime, { color: colors.textTertiary }]}>
            {timeAgo(n.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

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
        <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 22 }} />
      </View>

      {unread.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
            NEW · {unread.length}
          </Text>
          <View style={[styles.notifList, { borderColor: colors.border }]}>
            {unread.map(renderNotif)}
          </View>
        </View>
      )}

      {read.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>EARLIER</Text>
          <View style={[styles.notifList, { borderColor: colors.border }]}>
            {read.map(renderNotif)}
          </View>
        </View>
      )}

      {notifications.length === 0 && (
        <View style={styles.empty}>
          <Feather name="bell-off" size={40} color={colors.border} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No notifications yet
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: "800" },
  section: { marginBottom: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  notifList: { borderRadius: 16, overflow: "hidden", gap: 1 },
  notifRow: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderLeftWidth: 3,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  notifBody: { flex: 1, gap: 4 },
  notifTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notifTitle: { fontSize: 14, fontWeight: "700", flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  notifText: { fontSize: 13, lineHeight: 18 },
  notifTime: { fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 16 },
});
