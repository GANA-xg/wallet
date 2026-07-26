import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const STORAGE_PREFIX = "@vault_settings_";

interface SettingsState {
  darkMode: boolean;
  notifs: boolean;
  sound: boolean;
  hideBalance: boolean;
  datashare: boolean;
}

const DEFAULT_SETTINGS: SettingsState = {
  darkMode: true,
  notifs: true,
  sound: false,
  hideBalance: false,
  datashare: false,
};

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, updateUser } = useAuth();
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(`${STORAGE_PREFIX}all`);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next: SettingsState) => {
    await AsyncStorage.setItem(`${STORAGE_PREFIX}all`, JSON.stringify(next));
  }, []);

  const toggle = useCallback(
    async (key: keyof SettingsState) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = { ...settings, [key]: !settings[key] };
      setSettings(next);
      await persist(next);

      // Persist toggles locally — extend to API when settings endpoint exists
      await AsyncStorage.setItem(`@vault_${key}`, String(next[key as keyof SettingsState]));
    },
    [settings, persist],
  );

  const handleLogout = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await logout();
    router.replace("/(auth)/onboarding");
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const SECTIONS = [
    {
      title: "Preferences",
      items: [
        { icon: "moon" as const, label: "Dark Mode", key: "darkMode" as const, type: "toggle" as const },
        { icon: "globe" as const, label: "Language", key: "lang" as const, type: "value" as const, value: "English" },
        { icon: "bell" as const, label: "Push Notifications", key: "notifs" as const, type: "toggle" as const },
        { icon: "volume-2" as const, label: "Sound Effects", key: "sound" as const, type: "toggle" as const },
      ],
    },
    {
      title: "Privacy",
      items: [
        { icon: "eye-off" as const, label: "Hide Balance", key: "hideBalance" as const, type: "toggle" as const },
        { icon: "activity" as const, label: "Transaction History", key: "history" as const, type: "value" as const, value: "Visible" },
        { icon: "share-2" as const, label: "Data Sharing", key: "datashare" as const, type: "toggle" as const },
      ],
    },
    {
      title: "Account",
      items: [
        { icon: "user" as const, label: "Profile", key: "profile" as const, type: "nav" as const, route: "/profile" as const },
        { icon: "shield" as const, label: "Security", key: "security" as const, type: "nav" as const, route: "/security" as const },
      ],
    },
    {
      title: "Support",
      items: [
        { icon: "help-circle" as const, label: "Help Center", key: "help" as const, type: "link" as const, url: "https://support.vault.app" },
        { icon: "message-circle" as const, label: "Chat Support", key: "chat" as const, type: "link" as const, url: "https://vault.app/chat" },
        { icon: "star" as const, label: "Rate Vault", key: "rate" as const, type: "link" as const, url: "https://vault.app/rate" },
        { icon: "info" as const, label: "About", key: "about" as const, type: "value" as const, value: "v1.0.0" },
      ],
    },
  ];

  if (!loaded) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
          <View style={{ width: 22 }} />
        </View>
      </Animated.View>

      {SECTIONS.map((section, sIdx) => (
        <Animated.View key={section.title} entering={FadeInDown.duration(400).delay(100 + sIdx * 50)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {section.title.toUpperCase()}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.surface }]}>
            {section.items.map((item, i) => (
              <TouchableOpacity
                key={item.key}
                style={[styles.row, { borderBottomColor: colors.border }, i === section.items.length - 1 && { borderBottomWidth: 0 }]}
                activeOpacity={item.type === "toggle" ? 1 : 0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (item.type === "nav") router.push(item.route);
                  if (item.type === "link" && "url" in item && item.url) Linking.openURL(item.url);
                }}
              >
                <View style={[styles.rowIcon, { backgroundColor: colors.surfaceElevated }]}>
                  <Feather name={item.icon} size={15} color={colors.textSecondary} />
                </View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>{item.label}</Text>
                {item.type === "toggle" ? (
                  <Switch
                    value={settings[item.key as keyof SettingsState] ?? false}
                    onValueChange={() => toggle(item.key as keyof SettingsState)}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                ) : item.type === "value" ? (
                  <Text style={[styles.rowValue, { color: colors.mutedForeground }]}>{item.value}</Text>
                ) : (
                  <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      ))}

      <TouchableOpacity style={[styles.logoutBtn, { borderColor: colors.border }]} onPress={handleLogout}>
        <Feather name="log-out" size={16} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>

      <Text style={[styles.footer, { color: colors.textTertiary }]}>
        Vault · Version 1.0.0{"\n"}Made with ❤️ in India
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24, paddingHorizontal: 20 },
  title: { fontSize: 20, fontWeight: "700" },
  section: { marginBottom: 24, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5, marginBottom: 10 },
  sectionCard: { borderRadius: 14, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  rowLabel: { flex: 1, fontSize: 14, fontWeight: "600" },
  rowValue: { fontSize: 13 },
  logoutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, marginHorizontal: 20, marginTop: 8 },
  logoutText: { color: "#EF4444", fontSize: 15, fontWeight: "600" },
  footer: { textAlign: "center", fontSize: 12, lineHeight: 20, marginTop: 24, marginBottom: 20 },
});
