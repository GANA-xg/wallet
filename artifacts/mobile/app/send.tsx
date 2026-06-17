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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { Transaction } from "@/types";

const QUICK_CONTACTS = [
  { id: "c1", name: "Rahul", upi: "rahul@hdfc", initials: "R", color: "#7C3AED" },
  { id: "c2", name: "Priya", upi: "priya.k@okicici", initials: "P", color: "#059669" },
  { id: "c3", name: "Mom", upi: "sudha@sbi", initials: "M", color: "#DC2626" },
  { id: "c4", name: "Varun", upi: "varun@ybl", initials: "V", color: "#2563EB" },
];

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export default function SendScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addTransaction, balance, setBalance } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const amountNum = parseFloat(amount) || 0;
  const canSend = recipient.trim().length > 0 && amountNum > 0 && amountNum <= balance;

  const handleSend = () => {
    if (!canSend) return;
    if (step === "input") {
      setStep("confirm");
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const tx: Transaction = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      amount: amountNum,
      type: "debit",
      category: "transfer",
      description: `Sent to ${recipient}`,
      date: new Date().toISOString(),
      status: "success",
      merchant: recipient,
    };
    addTransaction(tx);
    setBalance(balance - amountNum);
    setStep("success");
  };

  if (step === "success") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <View style={styles.successContent}>
          <View style={styles.successCircle}>
            <LinearGradient colors={["#22C55E", "#16a34a"]} style={styles.successGradient}>
              <Feather name="check" size={40} color="#fff" />
            </LinearGradient>
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>Payment Sent!</Text>
          <Text style={[styles.successAmount, { color: colors.success }]}>
            ₹{amountNum.toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.successTo, { color: colors.mutedForeground }]}>to {recipient}</Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.doneBtnGrad}>
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => (step === "confirm" ? setStep("input") : router.back())}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          {step === "confirm" ? "Confirm Payment" : "Send Money"}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 100 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === "confirm" ? (
          <View style={styles.confirmView}>
            <View style={[styles.confirmCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.confirmLabel, { color: colors.mutedForeground }]}>Sending to</Text>
              <Text style={[styles.confirmValue, { color: colors.text }]}>{recipient}</Text>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <Text style={[styles.confirmLabel, { color: colors.mutedForeground }]}>Amount</Text>
              <Text style={[styles.confirmBigAmount, { color: colors.text }]}>
                ₹{amountNum.toLocaleString("en-IN")}
              </Text>
              {!!note && (
                <>
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <Text style={[styles.confirmLabel, { color: colors.mutedForeground }]}>Note</Text>
                  <Text style={[styles.confirmValue, { color: colors.text }]}>{note}</Text>
                </>
              )}
            </View>
            <Text style={[styles.upiInfo, { color: colors.mutedForeground }]}>
              Payment via UPI · aryan.sharma@hdfc
            </Text>
          </View>
        ) : (
          <>
            {/* Quick Contacts */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Recent</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contacts}>
              {QUICK_CONTACTS.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.contact}
                  onPress={() => setRecipient(c.upi)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.avatar, { backgroundColor: c.color, borderWidth: recipient === c.upi ? 2 : 0, borderColor: colors.primary }]}>
                    <Text style={styles.avatarText}>{c.initials}</Text>
                  </View>
                  <Text style={[styles.contactName, { color: recipient === c.upi ? colors.primary : colors.mutedForeground }]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Recipient Input */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>To</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: recipient ? colors.primary : colors.border }]}>
              <Feather name="at-sign" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="UPI ID or Phone Number"
                placeholderTextColor={colors.textTertiary}
                value={recipient}
                onChangeText={setRecipient}
                selectionColor={colors.primary}
                autoCapitalize="none"
              />
              {!!recipient && (
                <Feather name="check-circle" size={18} color={colors.success} />
              )}
            </View>

            {/* Amount */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Amount</Text>
            <View style={[styles.amountWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.rupee, { color: colors.text }]}>₹</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                placeholder="0"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={amount}
                onChangeText={setAmount}
                selectionColor={colors.primary}
              />
            </View>

            {/* Quick Amounts */}
            <View style={styles.quickAmounts}>
              {QUICK_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickAmount, { backgroundColor: colors.surface, borderColor: amount === String(a) ? colors.primary : colors.border }]}
                  onPress={() => setAmount(String(a))}
                >
                  <Text style={[styles.quickAmountText, { color: amount === String(a) ? colors.primary : colors.mutedForeground }]}>
                    ₹{a.toLocaleString("en-IN")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Note */}
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Note (optional)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="message-square" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Add a note..."
                placeholderTextColor={colors.textTertiary}
                value={note}
                onChangeText={setNote}
                selectionColor={colors.primary}
              />
            </View>

            {amountNum > balance && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                Insufficient balance
              </Text>
            )}
          </>
        )}
      </ScrollView>

      {/* Send Button */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 20 }]}>
        <TouchableOpacity
          style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={canSend ? ["#FF6B00", "#FF9240"] : ["#262B36", "#262B36"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendBtnGrad}
          >
            <Text style={styles.sendBtnText}>
              {step === "confirm" ? "Confirm & Pay" : "Review Payment"}
            </Text>
            <Feather name={step === "confirm" ? "lock" : "arrow-right"} size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 18, fontWeight: "700" },
  content: { paddingHorizontal: 20, gap: 0 },
  sectionLabel: { fontSize: 13, fontWeight: "600", letterSpacing: 0.5, marginBottom: 10, marginTop: 16 },
  contacts: { gap: 20, paddingBottom: 8 },
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
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    marginBottom: 4,
  },
  input: { flex: 1, fontSize: 16 },
  amountWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1,
    gap: 4,
  },
  rupee: { fontSize: 28, fontWeight: "800" },
  amountInput: { flex: 1, fontSize: 32, fontWeight: "800" },
  quickAmounts: { flexDirection: "row", gap: 8, marginTop: 10 },
  quickAmount: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  quickAmountText: { fontSize: 14, fontWeight: "600" },
  errorText: { fontSize: 13, marginTop: 8 },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
  sendBtn: { borderRadius: 16, overflow: "hidden" },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  sendBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  confirmView: { gap: 16, paddingTop: 20 },
  confirmCard: { borderRadius: 20, padding: 24, gap: 8 },
  confirmLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  confirmValue: { fontSize: 18, fontWeight: "700" },
  confirmBigAmount: { fontSize: 36, fontWeight: "800" },
  divider: { height: 1, marginVertical: 8 },
  upiInfo: { textAlign: "center", fontSize: 13 },
  successContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 40,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 8,
  },
  successGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successTitle: { fontSize: 28, fontWeight: "800" },
  successAmount: { fontSize: 40, fontWeight: "800" },
  successTo: { fontSize: 16 },
  doneBtn: { marginTop: 24, borderRadius: 16, overflow: "hidden", width: "100%" },
  doneBtnGrad: { paddingVertical: 16, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
