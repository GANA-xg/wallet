import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { Transaction } from "@/types";

type Step = "details" | "biometric" | "pin" | "processing" | "success";

const QUICK_CONTACTS = [
  { name: "Rahul Kumar", upi: "rahul@paytm", initials: "RK", color: "#3B82F6" },
  { name: "Priya Singh", upi: "priya@gpay", initials: "PS", color: "#8B5CF6" },
  { name: "Amit Gupta", upi: "amit.gupta@icici", initials: "AG", color: "#22C55E" },
  { name: "Sneha Patel", upi: "sneha@sbi", initials: "SP", color: "#F59E0B" },
];

const PIN_LENGTH = 6;

export default function SendScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { verifyBiometric } = useAuth();
  const { balance, setBalance, addTransaction, upiAccounts } = useWallet();
  const [step, setStep] = useState<Step>("details");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const primaryUPI = upiAccounts.find((u) => u.primary);

  const STEP_ORDER: Step[] = ["details", "biometric", "pin", "processing"];

  const handleContinue = async () => {
    const amt = parseFloat(amount);
    if (!recipient.trim()) { setErrorMsg("Enter a UPI ID or phone number"); return; }
    if (!amt || amt <= 0) { setErrorMsg("Enter a valid amount"); return; }
    if (amt > balance) { setErrorMsg("Insufficient balance"); return; }
    setErrorMsg("");
    setStep("biometric");
    const ok = await verifyBiometric();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("pin");
      setPin("");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStep("details");
      setErrorMsg("Biometric verification failed. Try again.");
    }
  };

  const handlePinChange = async (text: string) => {
    if (text.length > PIN_LENGTH) return;
    setPin(text);
    if (text.length === PIN_LENGTH) {
      setStep("processing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise<void>((r) => setTimeout(r, 1500));
      const amt = parseFloat(amount);
      const tx: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        amount: amt,
        type: "debit",
        category: "transfer",
        description: note || `Sent to ${recipient}`,
        date: new Date().toISOString(),
        status: "success",
        merchant: recipient,
      };
      addTransaction(tx);
      setBalance(balance - amt);
      setStep("success");
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Send Money</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Step indicator */}
      {step !== "success" && (
        <View style={styles.stepIndicator}>
          {STEP_ORDER.map((s, i) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.stepDot,
                  {
                    backgroundColor:
                      step === s
                        ? "#FF6B00"
                        : STEP_ORDER.indexOf(step) > i
                        ? "#22C55E"
                        : colors.muted,
                  },
                ]}
              />
              {i < STEP_ORDER.length - 1 && (
                <View
                  style={[
                    styles.stepLine,
                    { backgroundColor: STEP_ORDER.indexOf(step) > i ? "#22C55E" : colors.border },
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ─── Details ─── */}
      {step === "details" && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.formContent, { paddingBottom: bottomPad + 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT CONTACTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
            {QUICK_CONTACTS.map((c) => (
              <TouchableOpacity
                key={c.upi}
                style={styles.contactChip}
                onPress={() => { setRecipient(c.upi); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
              >
                <View style={[styles.contactAvatar, { backgroundColor: c.color }]}>
                  <Text style={styles.contactInitials}>{c.initials}</Text>
                </View>
                <Text style={[styles.contactName, { color: colors.text }]}>{c.name.split(" ")[0]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>UPI ID OR PHONE</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="at-sign" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="name@bank or 9876543210"
              placeholderTextColor={colors.textTertiary}
              value={recipient}
              onChangeText={setRecipient}
              autoCapitalize="none"
              keyboardType="email-address"
              selectionColor="#FF6B00"
            />
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AMOUNT</Text>
          <View style={[styles.amountRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.rupeeText, { color: colors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              placeholder="0"
              placeholderTextColor={colors.textTertiary}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              selectionColor="#FF6B00"
            />
          </View>

          <View style={styles.quickAmounts}>
            {["100", "500", "1000", "2000"].map((a) => (
              <TouchableOpacity
                key={a}
                style={[styles.quickAmtBtn, { backgroundColor: amount === a ? colors.primary : colors.surface }]}
                onPress={() => setAmount(a)}
              >
                <Text style={[styles.quickAmtText, { color: amount === a ? "#fff" : colors.mutedForeground }]}>
                  ₹{a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTE (OPTIONAL)</Text>
          <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="edit-3" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="What's it for?"
              placeholderTextColor={colors.textTertiary}
              value={note}
              onChangeText={setNote}
              selectionColor="#FF6B00"
            />
          </View>

          <View style={[styles.sourceRow, { backgroundColor: colors.surface }]}>
            <View style={[styles.sourceIcon, { backgroundColor: "#FF6B0015" }]}>
              <Feather name="database" size={16} color="#FF6B00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sourceLabel, { color: colors.mutedForeground }]}>FROM</Text>
              <Text style={[styles.sourceValue, { color: colors.text }]}>
                {primaryUPI?.upiId ?? "aryan.sharma@hdfc"}
              </Text>
            </View>
            <Text style={[styles.balanceAvail, { color: colors.mutedForeground }]}>
              ₹{balance.toLocaleString("en-IN")}
            </Text>
          </View>

          {!!errorMsg && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.continueBtn, { opacity: recipient && amount ? 1 : 0.5 }]}
            onPress={handleContinue}
            disabled={!recipient || !amount}
          >
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.continueBtnGrad}>
              <Feather name="cpu" size={18} color="#fff" />
              <Text style={styles.continueBtnText}>Verify &amp; Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ─── Biometric ─── */}
      {step === "biometric" && (
        <View style={styles.centeredContent}>
          <View style={[styles.bioCircle, { backgroundColor: "#FF6B0015", borderColor: "#FF6B00" }]}>
            <Feather name="cpu" size={52} color="#FF6B00" />
          </View>
          <Text style={[styles.bioTitle, { color: colors.text }]}>Biometric Check</Text>
          <Text style={[styles.bioSub, { color: colors.mutedForeground }]}>
            Authorising ₹{parseFloat(amount || "0").toLocaleString("en-IN")} to {recipient}
          </Text>
        </View>
      )}

      {/* ─── PIN ─── */}
      {step === "pin" && (
        <View style={styles.centeredContent}>
          <View style={[styles.pinSummary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pinSummaryLabel, { color: colors.mutedForeground }]}>PAYING</Text>
            <Text style={[styles.pinSummaryAmt, { color: colors.text }]}>
              ₹{parseFloat(amount).toLocaleString("en-IN")}
            </Text>
            <Text style={[styles.pinSummaryTo, { color: colors.mutedForeground }]}>{recipient}</Text>
          </View>

          <Text style={[styles.pinTitle, { color: colors.text }]}>Enter UPI PIN</Text>
          <Text style={[styles.pinSub, { color: colors.mutedForeground }]}>
            Any {PIN_LENGTH} digits in demo mode
          </Text>

          <View style={styles.pinDots}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  {
                    backgroundColor: i < pin.length ? "#FF6B00" : "transparent",
                    borderColor: i < pin.length ? "#FF6B00" : colors.border,
                  },
                ]}
              />
            ))}
          </View>

          <TextInput
            style={styles.pinHidden}
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            autoFocus
            secureTextEntry
            caretHidden
          />
        </View>
      )}

      {/* ─── Processing ─── */}
      {step === "processing" && (
        <View style={styles.centeredContent}>
          <View style={[styles.processingRing, { borderColor: "#FF6B00" }]}>
            <Feather name="loader" size={52} color="#FF6B00" />
          </View>
          <Text style={[styles.processingTitle, { color: colors.text }]}>Processing</Text>
          <Text style={[styles.processingSub, { color: colors.mutedForeground }]}>
            Debiting from {primaryUPI?.bank ?? "HDFC"}…
          </Text>
          <View style={styles.processingSteps}>
            {["Biometric verified ✓", "UPI PIN accepted ✓", "Bank processing…"].map((s, i) => (
              <View key={i} style={styles.processingStepRow}>
                <View style={[styles.processingDot, { backgroundColor: i < 2 ? "#22C55E" : "#FF6B00" }]} />
                <Text style={[styles.processingStepText, { color: colors.mutedForeground }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Success ─── */}
      {step === "success" && (
        <Animated.View style={[styles.centeredContent, { opacity: successOpacity }]}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
            <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.successGrad}>
              <Feather name="check" size={52} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Text style={[styles.successTitle, { color: colors.text }]}>Money Sent!</Text>
          <Text style={[styles.successAmt, { color: "#22C55E" }]}>
            ₹{parseFloat(amount).toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.successTo, { color: colors.mutedForeground }]}>to {recipient}</Text>

          <View style={[styles.successDetails, { backgroundColor: colors.surface }]}>
            {[
              ["UTR No.", `UTR${Date.now().toString().slice(-10)}`],
              ["Method", "UPI"],
              ["Status", "Credited"],
              ["Time", new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })],
            ].map(([l, v]) => (
              <View key={l} style={styles.successRow}>
                <Text style={[styles.successRowLabel, { color: colors.mutedForeground }]}>{l}</Text>
                <Text style={[styles.successRowValue, { color: colors.text }]}>{v}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.doneBtnGrad}>
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={{ paddingBottom: bottomPad + 8 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 12 },
  closeBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  stepIndicator: { flexDirection: "row", alignItems: "center", paddingHorizontal: 40, marginBottom: 24, paddingVertical: 4 },
  stepDot: { width: 12, height: 12, borderRadius: 6 },
  stepLine: { flex: 1, height: 2, marginHorizontal: 4 },
  formContent: { paddingHorizontal: 24, gap: 0 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  contactsScroll: { marginBottom: 8 },
  contactChip: { alignItems: "center", marginRight: 16, gap: 6 },
  contactAvatar: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  contactInitials: { color: "#fff", fontSize: 16, fontWeight: "800" },
  contactName: { fontSize: 12, fontWeight: "500" },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, marginBottom: 4 },
  input: { flex: 1, fontSize: 15 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, marginBottom: 8 },
  rupeeText: { fontSize: 28, fontWeight: "800" },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800" },
  quickAmounts: { flexDirection: "row", gap: 8, marginBottom: 4 },
  quickAmtBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  quickAmtText: { fontSize: 13, fontWeight: "700" },
  sourceRow: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 14, padding: 14, marginTop: 8 },
  sourceIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  sourceLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  sourceValue: { fontSize: 13, fontWeight: "600", marginTop: 1 },
  balanceAvail: { fontSize: 13, fontWeight: "600" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorText: { color: "#EF4444", fontSize: 13 },
  continueBtn: { borderRadius: 16, overflow: "hidden", marginTop: 20 },
  continueBtnGrad: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 16 },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  centeredContent: { flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 14 },
  bioCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", borderWidth: 2, marginBottom: 8 },
  bioTitle: { fontSize: 24, fontWeight: "800" },
  bioSub: { fontSize: 15, textAlign: "center" },
  pinSummary: { width: "100%", borderRadius: 20, padding: 20, alignItems: "center", gap: 4, marginBottom: 8 },
  pinSummaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  pinSummaryAmt: { fontSize: 40, fontWeight: "900" },
  pinSummaryTo: { fontSize: 14 },
  pinTitle: { fontSize: 20, fontWeight: "800" },
  pinSub: { fontSize: 13, textAlign: "center" },
  pinDots: { flexDirection: "row", gap: 14, marginVertical: 10 },
  pinDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  pinHidden: { position: "absolute", opacity: 0, width: 1, height: 1 },
  processingRing: { width: 120, height: 120, borderRadius: 60, justifyContent: "center", alignItems: "center", borderWidth: 3, marginBottom: 8 },
  processingTitle: { fontSize: 22, fontWeight: "800" },
  processingSub: { fontSize: 15 },
  processingSteps: { gap: 10, alignSelf: "stretch", marginTop: 8 },
  processingStepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  processingDot: { width: 8, height: 8, borderRadius: 4 },
  processingStepText: { fontSize: 14 },
  successCircle: { width: 120, height: 120, borderRadius: 60, overflow: "hidden", marginBottom: 8 },
  successGrad: { flex: 1, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 24, fontWeight: "800" },
  successAmt: { fontSize: 44, fontWeight: "900" },
  successTo: { fontSize: 15 },
  successDetails: { width: "100%", borderRadius: 20, padding: 20, gap: 12, marginTop: 8 },
  successRow: { flexDirection: "row", justifyContent: "space-between" },
  successRowLabel: { fontSize: 14 },
  successRowValue: { fontSize: 14, fontWeight: "600" },
  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 8 },
  doneBtnGrad: { paddingVertical: 16, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
