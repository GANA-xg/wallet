import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildLaunchRequest, PaymentAppButtons } from "@/components/PaymentAppButtons";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { parseUpiQr } from "@/services/payment/UpiQrParser";
import type { ParsedUpiQr, UpiAppId } from "@/services/payment/types";
import type { Transaction } from "@/types";

type Step = "scan" | "details" | "launch" | "launched";

const DEMO_QR =
  "upi://pay?pa=merchant@upi&pn=Demo%20Merchant&mc=5411&cu=INR&tn=Vault%20Demo";

export default function PayScreen() {
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
  const [permission, requestPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>("scan");
  const [parsedQr, setParsedQr] = useState<ParsedUpiQr | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [launchedApp, setLaunchedApp] = useState<UpiAppId | null>(null);
  const [holdId, setHoldId] = useState<string | null>(null);
  const scannedRef = useRef(false);

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

  const handleScan = useCallback((data: string) => {
    if (scannedRef.current) return;

    const parsed = parseUpiQr(data);
    if (!parsed) {
      setErrorMsg("Not a valid UPI QR code. Try again.");
      return;
    }

    scannedRef.current = true;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setParsedQr(parsed);
    setAmount(parsed.amount ?? "");
    setNote(parsed.transactionNote ?? "");
    setErrorMsg("");
    setStep("details");
  }, []);

  const handleSimulateScan = () => {
    scannedRef.current = false;
    handleScan(DEMO_QR);
  };

  const handleContinueToLaunch = async () => {
    if (!parsedQr) return;

    const amt = Number.parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErrorMsg("Enter a valid amount");
      return;
    }
    if (!canAffordPayment(amt)) {
      setErrorMsg(`You only have ₹${spendableBalance.toLocaleString("en-IN")} available right now.`);
      return;
    }

    setErrorMsg("");
    const ok = await verifyBiometric();
    if (!ok) {
      setErrorMsg("Biometric verification required to launch payment.");
      return;
    }

    const hold = createPaymentHold({
      amount: amt,
      merchant: parsedQr.payeeName ?? parsedQr.payeeAddress,
      payeeAddress: parsedQr.payeeAddress,
      note,
    });
    if (!hold) {
      setErrorMsg(`You only have ₹${spendableBalance.toLocaleString("en-IN")} available right now.`);
      return;
    }
    setHoldId(hold.id);

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("launch");
  };

  const handleLaunchFailed = () => {
    if (holdId) {
      releasePaymentHold(holdId);
      setHoldId(null);
    }
    setStep("details");
    setErrorMsg("Payment launch failed. Your funds were released.");
  };

  const handleLaunched = (appId: UpiAppId) => {
    if (!parsedQr) return;

    const amt = Number.parseFloat(amount);
    const appLabel = appId === "google_pay" ? "Google Pay" : appId === "phonepe" ? "PhonePe" : "Paytm";

    const tx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: amt,
      type: "debit",
      category: "transfer",
      description: note || `Payment to ${parsedQr.payeeName ?? parsedQr.payeeAddress}`,
      date: new Date().toISOString(),
      status: "launched",
      merchant: parsedQr.payeeName ?? parsedQr.payeeAddress,
      payeeAddress: parsedQr.payeeAddress,
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
    parsedQr && step === "launch"
      ? buildLaunchRequest({
          payeeAddress: parsedQr.payeeAddress,
          payeeName: parsedQr.payeeName,
          merchantCode: parsedQr.merchantCode,
          amount,
          note,
        })
      : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View entering={FadeInDown.duration(500).delay(0)} style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {step === "scan" ? "Scan & Pay" : "Pay Merchant"}
        </Text>
        <View style={{ width: 38 }} />
      </Animated.View>

      {step === "scan" && (
        <View style={[styles.scanContent, { paddingBottom: bottomPad + 24 }]}>
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Text style={[styles.scanTitle, { color: colors.text }]}>Scan any UPI QR code</Text>
          <Text style={[styles.scanSub, { color: colors.mutedForeground }]}>
            Vault reads merchant details and launches Google Pay, PhonePe, or Paytm. We never process payments.
          </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          {Platform.OS !== "web" && permission?.granted ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => handleScan(data)}
              />
              <View style={styles.scanOverlay}>
                <View style={[styles.scanCornerTL, { borderColor: colors.text }]} />
                <View style={[styles.scanCornerTR, { borderColor: colors.text }]} />
                <View style={[styles.scanCornerBL, { borderColor: colors.text }]} />
                <View style={[styles.scanCornerBR, { borderColor: colors.text }]} />
              </View>
            </View>
          ) : (
            <View style={[styles.cameraPlaceholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="camera-off" size={40} color={colors.mutedForeground} />
              <Text style={[styles.placeholderText, { color: colors.mutedForeground }]}>
                {Platform.OS === "web"
                  ? "Camera preview is unavailable on web."
                  : permission?.canAskAgain === false
                  ? "Camera permission denied. Enable it in settings or use demo scan."
                  : "Allow camera access to scan UPI QR codes."}
              </Text>
              {Platform.OS !== "web" && !permission?.granted && (
                <TouchableOpacity style={[styles.permissionBtn, { backgroundColor: colors.sunset }]} onPress={requestPermission}>
                  <Text style={[styles.permissionBtnText, { color: colors.text }]}>Allow Camera</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          </Animated.View>

          {!!errorMsg && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color={colors.error} />
              <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
            </View>
          )}

          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
          <TouchableOpacity style={styles.demoBtn} onPress={handleSimulateScan}>
            <LinearGradient colors={[colors.sunset, colors.sunsetDark]} style={styles.demoBtnGrad}>
              <Feather name="maximize" size={18} color={colors.text} />
              <Text style={[styles.demoBtnText, { color: colors.text }]}>Simulate UPI QR Scan (Demo)</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manualLink, { borderColor: colors.border }]}
            onPress={() => router.push("/send")}
          >
            <Feather name="edit-3" size={16} color={colors.primary} />
            <Text style={[styles.manualLinkText, { color: colors.primary }]}>Enter UPI ID manually</Text>
          </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {(step === "details" || step === "launch" || step === "launched") && parsedQr && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.detailsContent, { paddingBottom: bottomPad + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.merchantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.merchantIcon, { backgroundColor: colors.surfaceElevated }]}> 
              <Feather name="shopping-bag" size={22} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.merchantLabel, { color: colors.mutedForeground }]}>MERCHANT</Text>
              <Text style={[styles.merchantName, { color: colors.text }]}>
                {parsedQr.payeeName ?? "Unknown Merchant"}
              </Text>
              <Text style={[styles.merchantUpi, { color: colors.mutedForeground }]}>{parsedQr.payeeAddress}</Text>
              {parsedQr.merchantCode ? (
                <Text style={[styles.merchantCode, { color: colors.mutedForeground }]}>
                  MCC {parsedQr.merchantCode}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          {step !== "launched" && (
            <>
              <Animated.View entering={FadeInDown.duration(500).delay(200)}>
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
                  editable={step === "details"}
                  selectionColor={colors.primary}
                />
              </View>
              <Text style={[styles.remainingText, { color: colors.mutedForeground }]}> 
                {paymentPreview
                  ? `Remaining after payment: ₹${paymentPreview.remainingSpendable.toLocaleString("en-IN")}`
                  : `Available to spend: ₹${spendableBalance.toLocaleString("en-IN")}`}
              </Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(300)} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Merchant</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>{parsedQr.payeeName ?? parsedQr.payeeAddress}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Amount</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>₹{amountValue.toLocaleString("en-IN") || "0"}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>After hold</Text>
                  <Text style={[styles.summaryValue, { color: colors.text }]}>
                    ₹{paymentPreview?.remainingSpendable.toLocaleString("en-IN") ?? spendableBalance.toLocaleString("en-IN")}
                  </Text>
                </View>
                <Text style={[styles.summaryNote, { color: colors.mutedForeground }]}>Funds are reserved before launch. If launch fails, the hold is released.</Text>
              </Animated.View>

              <Animated.View entering={FadeInDown.duration(500).delay(400)}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>NOTES</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="edit-3" size={18} color={colors.mutedForeground} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="What's it for?"
                  placeholderTextColor={colors.textTertiary}
                  value={note}
                  onChangeText={setNote}
                  editable={step === "details"}
                  selectionColor={colors.primary}
                />
              </View>
              </Animated.View>

              {!!errorMsg && (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={14} color={colors.error} />
                  <Text style={[styles.errorText, { color: colors.error }]}>{errorMsg}</Text>
                </View>
              )}
            </>
          )}

          {step === "details" && (
            <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <TouchableOpacity
              style={[styles.continueBtn, { opacity: hasAmount && canAffordPayment(amountValue) ? 1 : 0.5 }]}
              onPress={handleContinueToLaunch}
              disabled={!hasAmount || !canAffordPayment(amountValue)}
            >
              <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.continueBtnGrad}>
                <Feather name="shield" size={18} color={colors.text} />
                <Text style={[styles.continueBtnText, { color: colors.text }]}>Verify & Choose UPI App</Text>
              </LinearGradient>
            </TouchableOpacity>
            </Animated.View>
          )}

          {step === "launch" && launchRequest && (
              <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <PaymentAppButtons request={launchRequest} onLaunched={handleLaunched} onLaunchFailed={handleLaunchFailed} />
              </Animated.View>
          )}

          {step === "launched" && launchedApp && (
            <Animated.View entering={FadeInDown.duration(500).delay(0)} style={styles.launchedCard}>
              <View style={[styles.launchedIcon, { backgroundColor: colors.successLight }]}>
                <Feather name="external-link" size={28} color={colors.success} />
              </View>
              <Text style={[styles.launchedTitle, { color: colors.text }]}>Payment Launched</Text>
              <Text style={[styles.launchedSub, { color: colors.mutedForeground }]}>
                Complete ₹{Number.parseFloat(amount).toLocaleString("en-IN")} in{" "}
                {launchedApp === "google_pay" ? "Google Pay" : launchedApp === "phonepe" ? "PhonePe" : "Paytm"}.
                Vault recorded this launch in your history.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <LinearGradient colors={[colors.sunset, colors.sunsetDark]} style={styles.doneBtnGrad}>
                  <Text style={[styles.doneBtnText, { color: colors.text }]}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      )}
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
    paddingBottom: 12,
  },
  closeBtn: { width: 38, height: 38, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  scanContent: { flex: 1, paddingHorizontal: 24, gap: 16 },
  scanTitle: { fontSize: 24, fontWeight: "800" },
  scanSub: { fontSize: 14, lineHeight: 20 },
  cameraWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
  },
  camera: { flex: 1 },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  scanCornerTL: {
    position: "absolute",
    top: "22%",
    left: "14%",
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderRadius: 6,
  },
  scanCornerTR: {
    position: "absolute",
    top: "22%",
    right: "14%",
    width: 36,
    height: 36,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderRadius: 6,
  },
  scanCornerBL: {
    position: "absolute",
    bottom: "22%",
    left: "14%",
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderRadius: 6,
  },
  scanCornerBR: {
    position: "absolute",
    bottom: "22%",
    right: "14%",
    width: 36,
    height: 36,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderRadius: 6,
  },
  cameraPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  placeholderText: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  permissionBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permissionBtnText: { fontWeight: "700" },
  demoBtn: { borderRadius: 16, overflow: "hidden" },
  demoBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  demoBtnText: { fontSize: 16, fontWeight: "700" },
  manualLink: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  manualLinkText: { fontSize: 14, fontWeight: "600" },
  detailsContent: { paddingHorizontal: 24, gap: 0 },
  merchantCard: {
    flexDirection: "row",
    gap: 14,
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  merchantIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  merchantLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  merchantName: { fontSize: 20, fontWeight: "800", marginTop: 2 },
  merchantUpi: { fontSize: 13, marginTop: 4 },
  merchantCode: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
  },
  rupeeText: { fontSize: 28, fontWeight: "800" },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15 },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorText: { fontSize: 13 },
  remainingText: { fontSize: 13, textAlign: "center", marginBottom: 4 },
  summaryCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  summaryLabel: { fontSize: 12, fontWeight: "600" },
  summaryValue: { fontSize: 12, fontWeight: "700", flexShrink: 1, textAlign: "right" },
  summaryNote: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  continueBtn: { borderRadius: 16, overflow: "hidden", marginTop: 24 },
  continueBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  continueBtnText: { fontSize: 17, fontWeight: "700" },
  launchedCard: { alignItems: "center", gap: 12, marginTop: 24 },
  launchedIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
  },
  launchedTitle: { fontSize: 22, fontWeight: "800" },
  launchedSub: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  doneBtn: { width: "100%", borderRadius: 16, overflow: "hidden", marginTop: 8 },
  doneBtnGrad: { paddingVertical: 16, alignItems: "center" },
  doneBtnText: { fontSize: 17, fontWeight: "700" },
});
