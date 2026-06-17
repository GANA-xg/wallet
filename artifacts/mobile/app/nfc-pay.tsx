import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
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

type Step = "ready" | "tapped" | "biometric" | "amount" | "pin" | "processing" | "success";

const PIN_LENGTH = 6;

function PulseRing({ anim, size }: { anim: Animated.Value; size: number }) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: "#FF6B00",
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
        transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.2] }) }],
      }}
    />
  );
}

export default function NFCPayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { verifyBiometric } = useAuth();
  const { addTransaction, balance, setBalance, upiAccounts } = useWallet();
  const [step, setStep] = useState<Step>("ready");
  const [amount, setAmount] = useState("250");
  const [pin, setPin] = useState("");
  const [merchant] = useState("Metro Station · Gate 4");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const tapScale = useRef(new Animated.Value(1)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step !== "ready" && step !== "tapped") return;

    const makePulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );

    const p1 = makePulse(pulse1, 0);
    const p2 = makePulse(pulse2, 460);
    const p3 = makePulse(pulse3, 920);
    p1.start(); p2.start(); p3.start();
    return () => { p1.stop(); p2.stop(); p3.stop(); };
  }, [step]);

  useEffect(() => {
    if (step === "success") {
      Animated.parallel([
        Animated.spring(successScale, { toValue: 1, useNativeDriver: true, friction: 5, tension: 60 }),
        Animated.timing(successOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(checkAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [step]);

  const handleTap = async () => {
    if (step !== "ready") return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(tapScale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.spring(tapScale, { toValue: 1, useNativeDriver: true, friction: 4 }),
    ]).start();
    setStep("tapped");
    await new Promise((r) => setTimeout(r, 500));
    setStep("biometric");
    const ok = await verifyBiometric();
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("amount");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStep("ready");
    }
  };

  const handleConfirmAmount = () => {
    const n = parseFloat(amount);
    if (!n || n <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("pin");
    setPin("");
  };

  const handlePinChange = async (text: string) => {
    if (text.length > PIN_LENGTH) return;
    setPin(text);
    if (text.length === PIN_LENGTH) {
      setStep("processing");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise((r) => setTimeout(r, 1600));

      const amountNum = parseFloat(amount);
      const tx: Transaction = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        amount: amountNum,
        type: "debit",
        category: "transport",
        description: `NFC Pay · ${merchant}`,
        date: new Date().toISOString(),
        status: "success",
        merchant,
      };
      addTransaction(tx);
      setBalance(balance - amountNum);
      setStep("success");
    }
  };

  const primaryUPI = upiAccounts.find((u) => u.primary);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>NFC Pay</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Ready / Tapped */}
      {(step === "ready" || step === "tapped") && (
        <View style={styles.content}>
          <Text style={[styles.merchantLabel, { color: colors.mutedForeground }]}>PAYING TO</Text>
          <Text style={[styles.merchantName, { color: colors.text }]}>{merchant}</Text>

          <View style={styles.nfcArea}>
            <Animated.View style={{ transform: [{ scale: tapScale }] }}>
              <PulseRing anim={pulse1} size={260} />
              <PulseRing anim={pulse2} size={210} />
              <PulseRing anim={pulse3} size={160} />
              <TouchableOpacity
                style={[styles.nfcCircle, { backgroundColor: step === "tapped" ? "#FF6B00" : "#171A21" }]}
                onPress={handleTap}
                activeOpacity={0.8}
              >
                <Feather
                  name="wifi"
                  size={52}
                  color={step === "tapped" ? "#fff" : "#FF6B00"}
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          <Text style={[styles.tapInstr, { color: colors.text }]}>
            {step === "tapped" ? "Authenticating…" : "Tap to simulate NFC"}
          </Text>
          <Text style={[styles.tapSub, { color: colors.mutedForeground }]}>
            Hold your phone near the NFC terminal
          </Text>

          <View style={[styles.upiRow, { backgroundColor: colors.surface }]}>
            <Feather name="credit-card" size={16} color={colors.mutedForeground} />
            <Text style={[styles.upiText, { color: colors.mutedForeground }]}>
              {primaryUPI?.upiId ?? "aryan.sharma@hdfc"}
            </Text>
          </View>
        </View>
      )}

      {/* Biometric verifying */}
      {step === "biometric" && (
        <View style={styles.content}>
          <View style={[styles.bioCircle, { backgroundColor: "#FF6B0015", borderColor: "#FF6B00" }]}>
            <Feather name="cpu" size={52} color="#FF6B00" />
          </View>
          <Text style={[styles.bioTitle, { color: colors.text }]}>Biometric Verification</Text>
          <Text style={[styles.bioSub, { color: colors.mutedForeground }]}>
            Use Face ID or Fingerprint to authorise
          </Text>
        </View>
      )}

      {/* Amount */}
      {step === "amount" && (
        <View style={styles.content}>
          <View style={[styles.detectedBadge, { backgroundColor: "#22C55E15" }]}>
            <Feather name="check-circle" size={14} color="#22C55E" />
            <Text style={[styles.detectedText, { color: "#22C55E" }]}>NFC Connected · {merchant}</Text>
          </View>

          <Text style={[styles.amountLabel, { color: colors.mutedForeground }]}>ENTER AMOUNT</Text>

          <View style={styles.amountRow}>
            <Text style={[styles.rupeeSign, { color: colors.text }]}>₹</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              autoFocus
              selectionColor="#FF6B00"
            />
          </View>

          <View style={styles.quickAmountsRow}>
            {["50", "100", "250", "500"].map((a) => (
              <TouchableOpacity
                key={a}
                style={[
                  styles.quickAmtChip,
                  { backgroundColor: amount === a ? "#FF6B00" : colors.surface },
                ]}
                onPress={() => setAmount(a)}
              >
                <Text style={[styles.quickAmtText, { color: amount === a ? "#fff" : colors.mutedForeground }]}>
                  ₹{a}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.bankRow, { backgroundColor: colors.surface }]}>
            <Feather name="database" size={15} color={colors.mutedForeground} />
            <Text style={[styles.bankText, { color: colors.mutedForeground }]}>
              HDFC Bank · ₹{(balance).toLocaleString("en-IN")} available
            </Text>
          </View>

          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirmAmount}
            disabled={!amount || parseFloat(amount) <= 0}
          >
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.confirmBtnGrad}>
              <Text style={styles.confirmBtnText}>Continue</Text>
              <Feather name="arrow-right" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* UPI PIN */}
      {step === "pin" && (
        <View style={styles.content}>
          <View style={[styles.pinSummary, { backgroundColor: colors.surface }]}>
            <Text style={[styles.pinSummaryLabel, { color: colors.mutedForeground }]}>PAYING</Text>
            <Text style={[styles.pinSummaryAmount, { color: colors.text }]}>₹{parseFloat(amount).toLocaleString("en-IN")}</Text>
            <Text style={[styles.pinSummaryMerchant, { color: colors.mutedForeground }]}>{merchant}</Text>
          </View>

          <Text style={[styles.pinLabel, { color: colors.text }]}>Enter UPI PIN</Text>
          <Text style={[styles.pinSub, { color: colors.mutedForeground }]}>
            Enter any {PIN_LENGTH} digits to confirm (demo)
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
            style={styles.pinHiddenInput}
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

      {/* Processing */}
      {step === "processing" && (
        <View style={styles.content}>
          <View style={[styles.processingCircle, { backgroundColor: "#FF6B0015" }]}>
            <Feather name="loader" size={48} color="#FF6B00" />
          </View>
          <Text style={[styles.processingTitle, { color: colors.text }]}>Processing Payment</Text>
          <Text style={[styles.processingSub, { color: colors.mutedForeground }]}>
            Communicating with bank…
          </Text>
          <View style={styles.processingSteps}>
            {["Biometric verified", "NFC secured", "Bank processing"].map((s, i) => (
              <View key={i} style={styles.processingStep}>
                <View style={[styles.processingDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.processingStepText, { color: colors.mutedForeground }]}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Success */}
      {step === "success" && (
        <Animated.View style={[styles.content, { opacity: successOpacity }]}>
          <Animated.View
            style={[
              styles.successCircle,
              { transform: [{ scale: successScale }] },
            ]}
          >
            <LinearGradient colors={["#22C55E", "#16A34A"]} style={styles.successGrad}>
              <Feather name="check" size={52} color="#fff" />
            </LinearGradient>
          </Animated.View>

          <Text style={[styles.successTitle, { color: colors.text }]}>Payment Successful!</Text>
          <Text style={[styles.successAmount, { color: "#22C55E" }]}>
            ₹{parseFloat(amount).toLocaleString("en-IN")}
          </Text>
          <Text style={[styles.successMerchant, { color: colors.mutedForeground }]}>{merchant}</Text>

          <View style={[styles.successDetails, { backgroundColor: colors.surface }]}>
            {[
              ["Transaction ID", `TXN${Date.now().toString().slice(-8)}`],
              ["Payment Method", "NFC · UPI"],
              ["Bank", "HDFC Bank"],
              ["Status", "Approved"],
            ].map(([label, value]) => (
              <View key={label} style={styles.successDetailRow}>
                <Text style={[styles.successDetailLabel, { color: colors.mutedForeground }]}>{label}</Text>
                <Text style={[styles.successDetailValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.back()}
          >
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.doneBtnGrad}>
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={{ paddingBottom: bottomPad + 16 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  closeBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  content: { flex: 1, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", gap: 12 },
  merchantLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  merchantName: { fontSize: 22, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  nfcArea: { width: 260, height: 260, alignItems: "center", justifyContent: "center", marginVertical: 12 },
  nfcCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, borderColor: "#FF6B00",
  },
  tapInstr: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  tapSub: { fontSize: 14, textAlign: "center", marginTop: -4 },
  upiRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8,
  },
  upiText: { fontSize: 13 },
  bioCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: "center", alignItems: "center",
    borderWidth: 2, marginBottom: 16,
  },
  bioTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  bioSub: { fontSize: 15, textAlign: "center" },
  detectedBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginBottom: 12,
  },
  detectedText: { fontSize: 13, fontWeight: "600" },
  amountLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginVertical: 4 },
  rupeeSign: { fontSize: 36, fontWeight: "800" },
  amountInput: { fontSize: 56, fontWeight: "900", minWidth: 120, textAlign: "center" },
  quickAmountsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  quickAmtChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  quickAmtText: { fontSize: 14, fontWeight: "700" },
  bankRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8,
  },
  bankText: { fontSize: 13 },
  confirmBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 16 },
  confirmBtnGrad: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 16 },
  confirmBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  pinSummary: {
    width: "100%", borderRadius: 20, padding: 20,
    alignItems: "center", gap: 4, marginBottom: 16,
  },
  pinSummaryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  pinSummaryAmount: { fontSize: 40, fontWeight: "900" },
  pinSummaryMerchant: { fontSize: 13 },
  pinLabel: { fontSize: 20, fontWeight: "800" },
  pinSub: { fontSize: 13, textAlign: "center" },
  pinDots: { flexDirection: "row", gap: 14, marginVertical: 16 },
  pinDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },
  pinHiddenInput: { position: "absolute", opacity: 0, width: 1, height: 1 },
  processingCircle: {
    width: 120, height: 120, borderRadius: 60,
    justifyContent: "center", alignItems: "center", marginBottom: 16,
  },
  processingTitle: { fontSize: 22, fontWeight: "800" },
  processingSub: { fontSize: 15 },
  processingSteps: { gap: 8, marginTop: 16, alignSelf: "stretch" },
  processingStep: { flexDirection: "row", alignItems: "center", gap: 10 },
  processingDot: { width: 8, height: 8, borderRadius: 4 },
  processingStepText: { fontSize: 14 },
  successCircle: { width: 120, height: 120, borderRadius: 60, overflow: "hidden", marginBottom: 20 },
  successGrad: { flex: 1, justifyContent: "center", alignItems: "center" },
  successTitle: { fontSize: 24, fontWeight: "800" },
  successAmount: { fontSize: 44, fontWeight: "900" },
  successMerchant: { fontSize: 15 },
  successDetails: { width: "100%", borderRadius: 20, padding: 20, gap: 12, marginTop: 8 },
  successDetailRow: { flexDirection: "row", justifyContent: "space-between" },
  successDetailLabel: { fontSize: 14 },
  successDetailValue: { fontSize: 14, fontWeight: "600" },
  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 16 },
  doneBtnGrad: { paddingVertical: 16, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
