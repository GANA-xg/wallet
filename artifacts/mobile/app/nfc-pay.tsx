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
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildLaunchRequest, PaymentAppButtons } from "@/components/PaymentAppButtons";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { UpiAppId } from "@/services/payment";
import type { Transaction } from "@/types";

type Step = "ready" | "tapped" | "biometric" | "amount" | "launch" | "launched";

const NFC_MERCHANT = {
  name: "Metro Station · Gate 4",
  upi: "dmrc.pay@upi",
  merchantCode: "4111",
};

function PulseRing({ anim, size }: { anim: Animated.Value; size: number }) {
  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: "#F4F4F5",
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
  const {
    addTransaction,
    spendableBalance,
    getPaymentPreview,
    canAffordPayment,
    createPaymentHold,
    releasePaymentHold,
    commitPaymentHold,
  } = useWallet();
  const [step, setStep] = useState<Step>("ready");
  const [amount, setAmount] = useState("250");
  const [launchedApp, setLaunchedApp] = useState<UpiAppId | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);

  const amountValue = Number.parseFloat(amount);
  const hasAmount = Number.isFinite(amountValue) && amountValue > 0;
  const paymentPreview = hasAmount ? getPaymentPreview(amountValue) : null;

  useEffect(() => {
    return () => {
      if (holdId) releasePaymentHold(holdId);
    };
  }, [holdId, releasePaymentHold]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;
  const tapScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (step !== "ready" && step !== "tapped") return;

    const makePulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 1400, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );

    const p1 = makePulse(pulse1, 0);
    const p2 = makePulse(pulse2, 460);
    const p3 = makePulse(pulse3, 920);
    p1.start();
    p2.start();
    p3.start();
    return () => {
      p1.stop();
      p2.stop();
      p3.stop();
    };
  }, [step, pulse1, pulse2, pulse3]);

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
    const n = Number.parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return;
    if (!canAffordPayment(n)) return;

    const hold = createPaymentHold({
      amount: n,
      merchant: NFC_MERCHANT.name,
      payeeAddress: NFC_MERCHANT.upi,
      note: "NFC Tap Payment",
    });
    if (!hold) return;
    setHoldId(hold.id);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("launch");
  };

  const handleLaunchFailed = () => {
    if (holdId) {
      releasePaymentHold(holdId);
      setHoldId(null);
    }
    setStep("amount");
  };

  const handleLaunched = (appId: UpiAppId) => {
    const amountNum = Number.parseFloat(amount);
    const tx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: amountNum,
      type: "debit",
      category: "transport",
      description: `NFC Pay · ${NFC_MERCHANT.name}`,
      date: new Date().toISOString(),
      status: "launched",
      merchant: NFC_MERCHANT.name,
      payeeAddress: NFC_MERCHANT.upi,
      launchedVia: appId,
    };
    if (holdId) {
      commitPaymentHold(holdId, tx);
      setHoldId(null);
    } else {
      addTransaction(tx);
    }
    setLaunchedApp(appId);
    setStep("launched");
  };

  const launchRequest =
    step === "launch"
      ? buildLaunchRequest({
          payeeAddress: NFC_MERCHANT.upi,
          payeeName: NFC_MERCHANT.name,
          merchantCode: NFC_MERCHANT.merchantCode,
          amount,
          note: "NFC Tap Payment",
        })
      : null;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <View style={[styles.header, { paddingTop: topPad + 16 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
              <Feather name="x" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>NFC Pay</Text>
            <View style={{ width: 38 }} />
          </View>

          {(step === "ready" || step === "tapped") && (
            <View style={styles.content}>
              <Text style={[styles.merchantLabel, { color: colors.mutedForeground }]}>PAYING TO</Text>
              <Text style={[styles.merchantName, { color: colors.text }]}>{NFC_MERCHANT.name}</Text>

              <View style={styles.nfcArea}>
                <Animated.View style={{ transform: [{ scale: tapScale }] }}>
                  <PulseRing anim={pulse1} size={260} />
                  <PulseRing anim={pulse2} size={210} />
                  <PulseRing anim={pulse3} size={160} />
                  <TouchableOpacity
                    style={[styles.nfcCircle, { backgroundColor: step === "tapped" ? "#F4F4F5" : "#171A21" }]}
                    onPress={handleTap}
                    activeOpacity={0.8}
                  >
                    <Feather name="wifi" size={52} color={step === "tapped" ? "#151515" : "#F4F4F5"} />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              <Text style={[styles.tapInstr, { color: colors.text }]}>
                {step === "tapped" ? "Authenticating…" : "Tap to simulate NFC"}
              </Text>
              <Text style={[styles.tapSub, { color: colors.mutedForeground }]}>
                NFC reads merchant UPI details, then launches your UPI app
              </Text>
            </View>
          )}

          {step === "biometric" && (
            <View style={styles.content}>
              <View style={[styles.bioCircle, { backgroundColor: "#F4F4F515", borderColor: "#F4F4F5" }]}> 
                <Feather name="cpu" size={52} color="#F4F4F5" />
              </View>
              <Text style={[styles.bioTitle, { color: colors.text }]}>Biometric Verification</Text>
              <Text style={[styles.bioSub, { color: colors.mutedForeground }]}>
                Confirm before launching payment in your UPI app
              </Text>
            </View>
          )}

          {step === "amount" && (
            <View style={styles.content}>
              <View style={[styles.detectedBadge, { backgroundColor: "#22C55E15" }]}>
                <Feather name="check-circle" size={14} color="#22C55E" />
                <Text style={[styles.detectedText, { color: "#22C55E" }]}>NFC Connected · {NFC_MERCHANT.name}</Text>
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
                    selectionColor={colors.primary}
                />
              </View>
                <Text style={[styles.remainingText, { color: colors.mutedForeground }]}> 
                  {paymentPreview
                    ? `Remaining after payment: ₹${paymentPreview.remainingSpendable.toLocaleString("en-IN")}`
                    : `Available to spend: ₹${spendableBalance.toLocaleString("en-IN")}`}
                </Text>

                <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Merchant</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>{NFC_MERCHANT.name}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Amount</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>₹{amountValue.toLocaleString("en-IN") || "0"}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>After hold</Text>
                    <Text style={[styles.summaryValue, { color: colors.text }]}>₹{paymentPreview?.remainingSpendable.toLocaleString("en-IN") ?? spendableBalance.toLocaleString("en-IN")}</Text>
                  </View>
                  <Text style={[styles.summaryNote, { color: colors.mutedForeground }]}>Funds are reserved before launch. If launch fails, the hold is released.</Text>
                </View>

              <View style={styles.quickAmountsRow}>
                {["50", "100", "250", "500"].map((a) => (
                  <TouchableOpacity
                    key={a}
                    style={[styles.quickAmtChip, { backgroundColor: amount === a ? colors.primary : colors.surface }]}
                    onPress={() => setAmount(a)}
                  >
                    <Text style={[styles.quickAmtText, { color: amount === a ? "#fff" : colors.mutedForeground }]}>
                      ₹{a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmAmount}
                disabled={!hasAmount || !canAffordPayment(amountValue)}
              >
                <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.confirmBtnGrad}>
                  <Text style={styles.confirmBtnText}>Choose UPI App</Text>
                  <Feather name="arrow-right" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {step === "launch" && launchRequest && (
            <View style={[styles.launchContent, { paddingBottom: bottomPad + 24 }]}>
              <PaymentAppButtons request={launchRequest} onLaunched={handleLaunched} onLaunchFailed={handleLaunchFailed} />
            </View>
          )}

          {step === "launched" && launchedApp && (
            <View style={styles.content}>
              <View style={[styles.launchedIcon, { backgroundColor: "#22C55E20" }]}>
                <Feather name="external-link" size={40} color="#22C55E" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Payment Launched</Text>
              <Text style={[styles.successAmount, { color: "#22C55E" }]}>
                ₹{Number.parseFloat(amount).toLocaleString("en-IN")}
              </Text>
              <Text style={[styles.successMerchant, { color: colors.mutedForeground }]}>
                Complete in {launchedApp === "google_pay" ? "Google Pay" : launchedApp === "phonepe" ? "PhonePe" : "Paytm"}
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <LinearGradient colors={["#F4F4F5", "#D4D4D8"]} style={styles.doneBtnGrad}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ paddingBottom: bottomPad + 16 }} />
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  launchContent: { flex: 1, paddingHorizontal: 24, justifyContent: "center" },
  merchantLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  merchantName: { fontSize: 22, fontWeight: "800", marginBottom: 12, textAlign: "center" },
  nfcArea: { width: 260, height: 260, alignItems: "center", justifyContent: "center", marginVertical: 12 },
  nfcCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#F4F4F5",
  },
  tapInstr: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  tapSub: { fontSize: 14, textAlign: "center", marginTop: -4 },
  bioCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 16,
  },
  bioTitle: { fontSize: 24, fontWeight: "800", textAlign: "center" },
  bioSub: { fontSize: 15, textAlign: "center" },
  detectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 12,
  },
  detectedText: { fontSize: 13, fontWeight: "600" },
  amountLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 4, marginVertical: 4 },
  rupeeSign: { fontSize: 36, fontWeight: "800" },
  amountInput: { fontSize: 56, fontWeight: "900", minWidth: 120, textAlign: "center" },
  remainingText: { fontSize: 13, marginTop: 4, textAlign: "center" },
  summaryCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginTop: 2,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { fontSize: 12, fontWeight: "600" },
  summaryValue: { fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  summaryNote: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  quickAmountsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  quickAmtChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  quickAmtText: { fontSize: 14, fontWeight: "700" },
  confirmBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 16 },
  confirmBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  confirmBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  launchedIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: "800" },
  successAmount: { fontSize: 44, fontWeight: "900" },
  successMerchant: { fontSize: 15 },
  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 16 },
  doneBtnGrad: { paddingVertical: 16, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
