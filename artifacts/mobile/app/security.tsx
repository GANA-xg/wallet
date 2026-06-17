import { Feather } from "@expo/vector-icons";
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

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [biometric, setBiometric] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [transactionPin, setTransactionPin] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [deviceBinding, setDeviceBinding] = useState(true);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const SECURITY_ITEMS = [
    {
      icon: "cpu" as const,
      label: "Biometric Login",
      sub: "Use fingerprint or Face ID",
      value: biometric,
      onToggle: setBiometric,
      color: "#22C55E",
    },
    {
      icon: "smartphone" as const,
      label: "2-Factor Authentication",
      sub: "Extra security for your account",
      value: twoFA,
      onToggle: setTwoFA,
      color: "#3B82F6",
    },
    {
      icon: "lock" as const,
      label: "Transaction PIN",
      sub: "Require PIN for every payment",
      value: transactionPin,
      onToggle: setTransactionPin,
      color: "#F59E0B",
    },
    {
      icon: "bell" as const,
      label: "Login Alerts",
      sub: "Get notified on new logins",
      value: loginAlerts,
      onToggle: setLoginAlerts,
      color: "#8B5CF6",
    },
    {
      icon: "link" as const,
      label: "Device Binding",
      sub: "This device is trusted",
      value: deviceBinding,
      onToggle: setDeviceBinding,
      color: "#EF4444",
    },
  ];

  const DEVICES = [
    { id: "d1", name: "iPhone 15 Pro", location: "Mumbai, MH", current: true, date: "Today" },
    { id: "d2", name: "MacBook Pro", location: "Mumbai, MH", current: false, date: "Jun 12" },
  ];

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
        <Text style={[styles.title, { color: colors.text }]}>Security</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Security Score */}
      <View style={[styles.scoreCard, { backgroundColor: colors.surface }]}>
        <View style={styles.scoreLeft}>
          <Text style={[styles.scoreTitle, { color: colors.text }]}>Security Score</Text>
          <Text style={[styles.scoreSub, { color: colors.mutedForeground }]}>
            Enable all settings for maximum protection
          </Text>
        </View>
        <View style={[styles.scoreCircle, { borderColor: "#22C55E" }]}>
          <Text style={[styles.scoreNum, { color: "#22C55E" }]}>84</Text>
        </View>
      </View>

      {/* Toggle Settings */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Protection</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
        {SECURITY_ITEMS.map((item, i) => (
          <View
            key={item.label}
            style={[
              styles.settingRow,
              { borderBottomColor: colors.border },
              i === SECURITY_ITEMS.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.settingIcon, { backgroundColor: item.color + "20" }]}>
              <Feather name={item.icon} size={18} color={item.color} />
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
              <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
            </View>
            <Switch
              value={item.value}
              onValueChange={item.onToggle}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      {/* Trusted Devices */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Trusted Devices</Text>
      <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
        {DEVICES.map((device, i) => (
          <View
            key={device.id}
            style={[
              styles.deviceRow,
              { borderBottomColor: colors.border },
              i === DEVICES.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.deviceIcon, { backgroundColor: colors.muted }]}>
              <Feather
                name={device.name.includes("Mac") ? "monitor" : "smartphone"}
                size={18}
                color={colors.mutedForeground}
              />
            </View>
            <View style={styles.deviceInfo}>
              <View style={styles.deviceNameRow}>
                <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
                {device.current && (
                  <View style={[styles.currentBadge, { backgroundColor: colors.primary + "20" }]}>
                    <Text style={[styles.currentText, { color: colors.primary }]}>Current</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.deviceMeta, { color: colors.mutedForeground }]}>
                {device.location} · {device.date}
              </Text>
            </View>
            {!device.current && (
              <TouchableOpacity>
                <Feather name="x" size={16} color={colors.error} />
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      {/* Change PIN */}
      <TouchableOpacity style={[styles.changePinBtn, { borderColor: colors.border }]}>
        <Feather name="lock" size={18} color={colors.primary} />
        <Text style={[styles.changePinText, { color: colors.text }]}>Change Transaction PIN</Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </TouchableOpacity>
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
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  scoreLeft: { flex: 1, gap: 4 },
  scoreTitle: { fontSize: 16, fontWeight: "700" },
  scoreSub: { fontSize: 13 },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNum: { fontSize: 22, fontWeight: "900" },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  settingsCard: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 15, fontWeight: "600" },
  settingSub: { fontSize: 12, marginTop: 2 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deviceName: { fontSize: 14, fontWeight: "600" },
  currentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  currentText: { fontSize: 10, fontWeight: "700" },
  deviceMeta: { fontSize: 12, marginTop: 2 },
  changePinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  changePinText: { flex: 1, fontSize: 15, fontWeight: "600" },
});
