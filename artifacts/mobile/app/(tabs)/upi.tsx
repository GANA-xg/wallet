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

import { TransactionItem } from "@/components/TransactionItem";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";

const CONTACTS = [
  { id: "ct1", name: "Rahul", upi: "rahul@hdfc", initials: "R", color: "#7C3AED" },
  { id: "ct2", name: "Priya", upi: "priya.k@okicici", initials: "P", color: "#059669" },
  { id: "ct3", name: "Mom", upi: "sudha@sbi", initials: "M", color: "#DC2626" },
  { id: "ct4", name: "Varun", upi: "varun@ybl", initials: "V", color: "#2563EB" },
  { id: "ct5", name: "Anita", upi: "anita.r@paytm", initials: "A", color: "#D97706" },
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
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.text }]}>UPI Launcher</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Scan QR codes or enter a UPI ID — Vault opens Google Pay, PhonePe, or Paytm with details pre-filled.
      </Text>

      {/* Primary UPI Card */}
      {primaryUPI && (
        <LinearGradient
          colors={["#171A21", "#1E2128"]}
          style={[styles.upiCard, { borderColor: colors.border }]}
        >
          <View style={styles.upiCardTop}>
            <View style={[styles.upiIcon, { backgroundColor: "#FF6B0015" }]}>
              <Feather name="send" size={22} color={colors.primary} />
            </View>
            <View style={styles.upiInfo}>
              <Text style={[styles.upiId, { color: colors.text }]}>{primaryUPI.upiId}</Text>
              <Text style={[styles.bankName, { color: colors.mutedForeground }]}>
                {primaryUPI.bank} · Primary
              </Text>
            </View>
            <View style={[styles.primaryBadge, { backgroundColor: "#FF6B0020" }]}>
              <Text style={[styles.primaryBadgeText, { color: colors.primary }]}>PRIMARY</Text>
            </View>
          </View>
        </LinearGradient>
      )}

      {/* UPI Lite */}
      <View style={[styles.upiLiteCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.upiLiteLeft}>
          <Feather name="zap" size={18} color="#F59E0B" />
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

      {/* Actions */}
      <View style={styles.actions}>
        {[
          { icon: "maximize", label: "Scan\n& Pay", color: "#FF6B00", route: "/pay" },
          { icon: "send", label: "Pay\nUPI ID", color: "#7C3AED", route: "/send" },
          { icon: "download", label: "Receive\nMoney", color: "#22C55E", route: "/receive" },
          { icon: "clock", label: "History", color: "#3B82F6", route: "/(tabs)/transactions" },
        ].map((item, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.action, { backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as never);
            }}
          >
            <View style={[styles.actionIcon, { backgroundColor: item.color + "20" }]}>
              <Feather name={item.icon as keyof typeof Feather.glyphMap} size={22} color={item.color} />
            </View>
            <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Pay Contacts */}
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
              <Text style={[styles.contactName, { color: colors.mutedForeground }]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.contact} activeOpacity={0.7}>
            <View style={[styles.avatar, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
              <Feather name="plus" size={20} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.contactName, { color: colors.mutedForeground }]}>New</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Other UPI IDs */}
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
              <View style={[styles.upiIcon, { backgroundColor: colors.muted }]}>
                <Feather name="at-sign" size={16} color={colors.primary} />
              </View>
              <View style={styles.upiRowInfo}>
                <Text style={[styles.upiRowId, { color: colors.text }]}>{u.upiId}</Text>
                <Text style={[styles.upiRowBank, { color: colors.mutedForeground }]}>{u.bank}</Text>
              </View>
              {u.primary ? (
                <Feather name="check-circle" size={18} color={colors.success} />
              ) : (
                <Text style={[styles.setPrimary, { color: colors.primary }]}>Set Primary</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Payments */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Payments</Text>
        <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
          {upiTx.map((tx) => (
            <TransactionItem key={tx.id} transaction={tx} />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  title: { fontSize: 28, fontWeight: "800", marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  upiCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  upiCardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  upiIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  upiInfo: { flex: 1 },
  upiId: { fontSize: 15, fontWeight: "700" },
  bankName: { fontSize: 13, marginTop: 2 },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  upiLiteCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  upiLiteLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  upiLiteTitle: { fontSize: 14, fontWeight: "700" },
  upiLiteSub: { fontSize: 12, marginTop: 1 },
  upiLiteBalance: { fontSize: 16, fontWeight: "800" },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  action: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  actionLabel: { fontSize: 11, fontWeight: "500", textAlign: "center" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  contacts: { gap: 20, paddingBottom: 4 },
  contact: { alignItems: "center", gap: 6 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  contactName: { fontSize: 12, fontWeight: "500" },
  upiList: { borderRadius: 16, overflow: "hidden" },
  upiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  upiRowInfo: { flex: 1 },
  upiRowId: { fontSize: 14, fontWeight: "600" },
  upiRowBank: { fontSize: 12, marginTop: 2 },
  setPrimary: { fontSize: 13, fontWeight: "600" },
  txCard: { borderRadius: 16, paddingHorizontal: 16 },
});
