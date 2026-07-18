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
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";
import BiometricPrompt from "@/app/biometric-prompt";
import { useAuth } from "@/context/AuthContext";

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { verifyBiometric } = useAuth();
  const [biometric, setBiometric] = useState(true);
  const [twoFA, setTwoFA] = useState(false);
  const [transactionPin, setTransactionPin] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [deviceBinding, setDeviceBinding] = useState(true);
  const [biometricPending, setBiometricPending] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleBiometricSuccess = () => {
    if (biometricPending === "biometric") setBiometric(!biometric);
    if (biometricPending === "twoFA") setTwoFA(!twoFA);
    if (biometricPending === "transactionPin") setTransactionPin(!transactionPin);
    if (biometricPending === "loginAlerts") setLoginAlerts(!loginAlerts);
    if (biometricPending === "deviceBinding") setDeviceBinding(!deviceBinding);
    setBiometricPending(null);
  };

  const SECURITY_ITEMS = [
    {
      icon: "cpu" as const,
      label: "Biometric Login",
      sub: "Use fingerprint or Face ID",
      value: biometric,
      onToggle: () => setBiometricPending("biometric"),
      color: "#2E7D32",
    },
    {
      icon: "smartphone" as const,
      label: "2-Factor Authentication",
      sub: "Extra security for your account",
      value: twoFA,
      onToggle: () => setBiometricPending("twoFA"),
      color: "#D06224",
    },
    {
      icon: "lock" as const,
      label: "Transaction PIN",
      sub: "Require PIN for every payment",
      value: transactionPin,
      onToggle: () => setBiometricPending("transactionPin"),
      color: "#EAC891",
    },
    {
      icon: "bell" as const,
      label: "Login Alerts",
      sub: "Get notified on new logins",
      value: loginAlerts,
      onToggle: () => setBiometricPending("loginAlerts"),
      color: "#AE431E",
    },
    {
      icon: "link" as const,
      label: "Device Binding",
      sub: "This device is trusted",
      value: deviceBinding,
      onToggle: () => setBiometricPending("deviceBinding"),
      color: "#2E7D32",
    },
  ];

  const DEVICES = [
    { id: "d1", name: "iPhone 15 Pro", location: "Mumbai, MH", current: true, date: "Today" },
    { id: "d2", name: "MacBook Pro", location: "Mumbai, MH", current: false, date: "Jun 12" },
  ];

  const enabledCount = SECURITY_ITEMS.filter((item) => item.value).length;
  const score = Math.round((enabledCount / SECURITY_ITEMS.length) * 100);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
          >
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Security</Text>
          <View style={{ width: 22 }} />
        </View>
      </Animated.View>

      {/* Security Score */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        <View style={[styles.scoreCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.scoreLeft}>
            <Text style={[styles.scoreTitle, { color: colors.text }]}>Security Score</Text>
            <Text style={[styles.scoreSub, { color: colors.mutedForeground }]}>
              {enabledCount}/{SECURITY_ITEMS.length} settings enabled
            </Text>
          </View>
          <View style={[styles.scoreCircle, { borderColor: colors.success }]}>
            <Text style={[styles.scoreNum, { color: colors.success }]}>{score}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Toggle Settings */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
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
              <View style={[styles.settingIcon, { backgroundColor: item.color + "18" }]}>
                <Feather name={item.icon} size={16} color={item.color} />
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingLabel, { color: colors.text }]}>{item.label}</Text>
                <Text style={[styles.settingSub, { color: colors.mutedForeground }]}>{item.sub}</Text>
              </View>
              <Switch
                value={item.value}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  item.onToggle();
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Trusted Devices */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
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
              <View style={[styles.deviceIcon, { backgroundColor: colors.surfaceElevated }]}>
                <Feather
                  name={device.name.includes("Mac") ? "monitor" : "smartphone"}
                  size={16}
                  color={colors.textSecondary}
                />
              </View>
              <View style={styles.deviceInfo}>
                <View style={styles.deviceNameRow}>
                  <Text style={[styles.deviceName, { color: colors.text }]}>{device.name}</Text>
                  {device.current && (
                    <View style={[styles.currentBadge, { backgroundColor: colors.successLight + "20" }]}>
                      <Text style={[styles.currentText, { color: colors.success }]}>Current</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.deviceMeta, { color: colors.mutedForeground }]}>
                  {device.location} · {device.date}
                </Text>
              </View>
              {!device.current && (
                <TouchableOpacity
                  onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                >
                  <Feather name="x" size={14} color={colors.error} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Change PIN */}
      <Animated.View entering={FadeInDown.duration(500).delay(250)}>
        <TouchableOpacity
          style={[styles.changePinBtn, { borderColor: colors.border }]}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          activeOpacity={0.8}
        >
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={[styles.changePinText, { color: colors.text }]}>Change Transaction PIN</Text>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>

      <BiometricPrompt
        visible={biometricPending !== null}
        title="Change Security Setting"
        subtitle="Authorize with biometrics to update your security preferences"
        onSuccess={handleBiometricSuccess}
        onCancel={() => setBiometricPending(null)}
      />
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
    borderWidth: 1,
  },
  scoreLeft: { flex: 1, gap: 4 },
  scoreTitle: { fontSize: 15, fontWeight: "700" },
  scoreSub: { fontSize: 12 },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreNum: { fontSize: 20, fontWeight: "900" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  settingsCard: { borderRadius: 16, overflow: "hidden", marginBottom: 24 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingInfo: { flex: 1 },
  settingLabel: { fontSize: 14, fontWeight: "600" },
  settingSub: { fontSize: 11, marginTop: 2 },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  deviceIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  deviceInfo: { flex: 1 },
  deviceNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deviceName: { fontSize: 13, fontWeight: "600" },
  currentBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  currentText: { fontSize: 9, fontWeight: "700" },
  deviceMeta: { fontSize: 11, marginTop: 2 },
  changePinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  changePinText: { flex: 1, fontSize: 14, fontWeight: "600" },
});
