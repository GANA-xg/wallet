import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { TransactionItem } from "@/components/TransactionItem";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const CONTACTS = [
  { id: "ct1", name: "Rahul", upi: "rahul@hdfc", initials: "R", color: "#AE431E" },
  { id: "ct2", name: "Priya", upi: "priya.k@okicici", initials: "P", color: "#2E7D32" },
  { id: "ct3", name: "Mom", upi: "sudha@sbi", initials: "M", color: "#D06224" },
  { id: "ct4", name: "Varun", upi: "varun@ybl", initials: "V", color: "#D06224" },
  { id: "ct5", name: "Anita", upi: "anita.r@paytm", initials: "A", color: "#EAC891" },
];

export default function UPIScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { upiAccounts, transactions, setPrimaryUPI } = useWallet();
  const [upiLiteBalance] = useState(1500);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const primaryUPI = upiAccounts.find((u) => u.primary);
  const upiTx = transactions.slice(0, 6);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <Text style={[styles.title, { color: colors.text }]}>UPI</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Send money, scan QR, or pay bills
        </Text>
      </Animated.View>

      {/* Primary UPI Card */}
      {primaryUPI && (
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <LinearGradient
            colors={[colors.primary, colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upiCard}
          >
            <View style={styles.upiCardTop}>
              <View style={styles.upiIcon}>
                <Feather name="send" size={18} color="rgba(255,255,255,0.9)" />
              </View>
              <View style={styles.upiInfo}>
                <Text style={styles.upiId}>{primaryUPI.upiId}</Text>
                <Text style={styles.bankName}>{primaryUPI.bank}</Text>
              </View>
            </View>
            <View style={styles.upiCardBottom}>
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
              </View>
              <Feather name="chevron-right" size={16} color="rgba(255,255,255,0.5)" />
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* UPI Lite */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
        <View style={[styles.upiLiteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.upiLiteLeft}>
            <View style={[styles.upiLiteIcon, { backgroundColor: colors.warning + "20" }]}>
              <Feather name="zap" size={14} color={colors.warning} />
            </View>
            <View>
              <Text style={[styles.upiLiteTitle, { color: colors.text }]}>UPI Lite</Text>
              <Text style={[styles.upiLiteSub, { color: colors.mutedForeground }]}>
                Instant small payments
              </Text>
            </View>
          </View>
          <Text style={[styles.upiLiteBalance, { color: colors.text }]}>
            ₹{upiLiteBalance.toLocaleString("en-IN")}
          </Text>
        </View>
      </Animated.View>

      {/* Primary Actions */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <View style={styles.actions}>
          {[
            { icon: "maximize", label: "Scan & Pay", color: colors.primary, route: "/pay", primary: true },
            { icon: "send", label: "Send Money", color: colors.secondary, route: "/send", primary: false },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionBtn, { flex: 1 }]}
              activeOpacity={0.8}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as never);
              }}
            >
              {item.primary ? (
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionInner}
                >
                  <Feather name={item.icon as keyof typeof Feather.glyphMap} size={18} color="#FFFFFF" />
                  <Text style={styles.actionLabelPrimary}>{item.label}</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.actionInner, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                  <Feather name={item.icon as keyof typeof Feather.glyphMap} size={18} color={colors.primary} />
                  <Text style={[styles.actionLabelSecondary, { color: colors.text }]}>{item.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Secondary Actions */}
      <Animated.View entering={FadeInDown.duration(500).delay(250)}>
        <View style={styles.secondaryActions}>
          {[
            { icon: "download", label: "Receive", route: "/receive" },
            { icon: "clock", label: "History", route: "/(tabs)/transactions" },
            { icon: "file-text", label: "Bills", route: "/rewards" },
          ].map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.secondaryBtn, { backgroundColor: colors.surface }]}
              activeOpacity={0.7}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(item.route as never);
              }}
            >
              <View style={[styles.secondaryIcon, { backgroundColor: colors.surfaceElevated }]}>
                <Feather name={item.icon as keyof typeof Feather.glyphMap} size={16} color={colors.textSecondary} />
              </View>
              <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Quick Pay Contacts */}
      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Pay</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contacts}>
            {CONTACTS.map((c) => (
              <TouchableOpacity
                key={c.id}
                style={styles.contact}
                activeOpacity={0.7}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/send");
                }}
              >
                <View style={[styles.avatar, { backgroundColor: c.color }]}>
                  <Text style={styles.avatarText}>{c.initials}</Text>
                </View>
                <Text style={[styles.contactName, { color: colors.textSecondary }]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.contact}
              activeOpacity={0.7}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <View style={[styles.avatar, { backgroundColor: colors.surfaceElevated, borderWidth: 1, borderColor: colors.border }]}>
                <Feather name="plus" size={18} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.contactName, { color: colors.mutedForeground }]}>New</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Animated.View>

      {/* Other UPI IDs */}
      <Animated.View entering={FadeInDown.duration(500).delay(350)}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>UPI IDs</Text>
          <View style={[styles.upiList, { backgroundColor: colors.surface }]}>
            {upiAccounts.map((u) => (
              <TouchableOpacity
                key={u.id}
                style={[styles.upiRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  if (!u.primary) {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPrimaryUPI(u.id);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.upiIconSmall, { backgroundColor: colors.surfaceElevated }]}>
                  <Feather name="at-sign" size={14} color={colors.primary} />
                </View>
                <View style={styles.upiRowInfo}>
                  <Text style={[styles.upiRowId, { color: colors.text }]}>{u.upiId}</Text>
                  <Text style={[styles.upiRowBank, { color: colors.mutedForeground }]}>{u.bank}</Text>
                </View>
                {u.primary ? (
                  <Feather name="check-circle" size={16} color={colors.success} />
                ) : (
                  <Text style={[styles.setPrimary, { color: colors.primary }]}>Set Primary</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>

      {/* Recent Payments */}
      <Animated.View entering={FadeInDown.duration(500).delay(400)}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent</Text>
          <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
            {upiTx.map((tx) => (
              <TransactionItem key={tx.id} transaction={tx} />
            ))}
          </View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  upiCard: {
    borderRadius: 20, padding: 18, marginBottom: 12,
    overflow: "hidden",
  },
  upiCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  upiIcon: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: "center", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  upiInfo: { flex: 1 },
  upiId: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  bankName: { fontSize: 12, marginTop: 2, color: "rgba(255,255,255,0.7)" },
  upiCardBottom: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginTop: 14,
  },
  primaryBadge: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  primaryBadgeText: { fontSize: 9, fontWeight: "800", letterSpacing: 1, color: "#FFFFFF" },
  upiLiteCard: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 16,
  },
  upiLiteLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  upiLiteIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  upiLiteTitle: { fontSize: 13, fontWeight: "700" },
  upiLiteSub: { fontSize: 11, marginTop: 1 },
  upiLiteBalance: { fontSize: 15, fontWeight: "800" },
  actions: {
    flexDirection: "row", gap: 12, marginBottom: 12,
  },
  actionBtn: { borderRadius: 16, overflow: "hidden" },
  actionInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15, borderRadius: 16, borderWidth: 1, borderColor: "transparent",
  },
  actionLabelPrimary: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  actionLabelSecondary: { fontSize: 14, fontWeight: "700" },
  secondaryActions: {
    flexDirection: "row", gap: 10, marginBottom: 24,
  },
  secondaryBtn: {
    flex: 1, alignItems: "center", gap: 6, paddingVertical: 12, borderRadius: 14,
  },
  secondaryIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  secondaryLabel: { fontSize: 11, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  contacts: { gap: 18, paddingBottom: 4 },
  contact: { alignItems: "center", gap: 6 },
  avatar: {
    width: 48, height: 48, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: "#FFFDF9", fontSize: 16, fontWeight: "800" },
  contactName: { fontSize: 11, fontWeight: "500" },
  upiList: { borderRadius: 16, overflow: "hidden" },
  upiRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  upiIconSmall: { width: 32, height: 32, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  upiRowInfo: { flex: 1 },
  upiRowId: { fontSize: 13, fontWeight: "600" },
  upiRowBank: { fontSize: 11, marginTop: 2 },
  setPrimary: { fontSize: 12, fontWeight: "600" },
  txCard: { borderRadius: 16, paddingHorizontal: 14 },
});
