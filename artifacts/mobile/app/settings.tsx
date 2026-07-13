import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "Preferences",
    items: [
      { icon: "moon" as const, label: "Dark Mode", key: "darkMode", toggle: true },
      { icon: "globe" as const, label: "Language", value: "English", key: "lang", toggle: false },
      { icon: "bell" as const, label: "Push Notifications", key: "notifs", toggle: true },
      { icon: "volume-2" as const, label: "Sound Effects", key: "sound", toggle: true },
    ],
  },
  {
    title: "Privacy",
    items: [
      { icon: "eye-off" as const, label: "Hide Balance", key: "hideBalance", toggle: true },
      { icon: "activity" as const, label: "Transaction History", value: "Visible", key: "history", toggle: false },
      { icon: "share-2" as const, label: "Data Sharing", key: "datashare", toggle: false, toggle_val: false },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: "help-circle" as const, label: "Help Center", key: "help", toggle: false },
      { icon: "message-circle" as const, label: "Chat Support", key: "chat", toggle: false },
      { icon: "star" as const, label: "Rate Vault", key: "rate", toggle: false },
      { icon: "info" as const, label: "About", value: "v1.0.0", key: "about", toggle: false },
    ],
  },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    darkMode: true,
    notifs: true,
    sound: false,
    hideBalance: false,
    datashare: false,
  });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const toggle = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
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
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <View style={{ width: 22 }} />
      </View>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {section.title.toUpperCase()}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.row,
                  { borderBottomColor: colors.border },
                  i === section.items.length - 1 && { borderBottomWidth: 0 },
                ]}
                activeOpacity={item.toggle ? 1 : 0.7}
                onPress={() => {
                  if (!item.toggle) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.muted }]}>
                  <Feather name={item.icon} size={16} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                {item.toggle ? (
                  <Switch
                    value={toggles[item.key] ?? false}
                    onValueChange={() => toggle(item.key)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                ) : item.value ? (
                  <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{item.value}</Text>
                ) : (
                  <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        Vault · Version 1.0.0{"\n"}Made with ❤️ in India
      </Text>
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
    marginBottom: 24,
  },
  title: { fontSize: 20, fontWeight: "800" },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  sectionCard: { borderRadius: 16, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: "500" },
  rowValue: { fontSize: 14 },
  footer: { textAlign: "center", fontSize: 13, lineHeight: 22 },
});
