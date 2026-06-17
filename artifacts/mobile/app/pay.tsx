import { Feather } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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

import { buildLaunchRequest, PaymentAppButtons } from "@/components/PaymentAppButtons";
import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { parseUpiQr, type ParsedUpiQr, type UpiAppId } from "@/services/payment";
import type { Transaction } from "@/types";

type Step = "scan" | "details" | "launch" | "launched";

const DEMO_QR =
  "upi://pay?pa=merchant@upi&pn=Demo%20Merchant&mc=5411&cu=INR&tn=Vault%20Demo";

export default function PayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { verifyBiometric } = useAuth();
  const { addTransaction } = useWallet();
  const [permission, requestPermission] = useCameraPermissions();

  const [step, setStep] = useState<Step>("scan");
  const [parsedQr, setParsedQr] = useState<ParsedUpiQr | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [launchedApp, setLaunchedApp] = useState<UpiAppId | null>(null);
  const scannedRef = useRef(false);

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

    setErrorMsg("");
    const ok = await verifyBiometric();
    if (!ok) {
      setErrorMsg("Biometric verification required to launch payment.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("launch");
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

    addTransaction(tx);
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
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Feather name="x" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {step === "scan" ? "Scan & Pay" : "Pay Merchant"}
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {step === "scan" && (
        <View style={[styles.scanContent, { paddingBottom: bottomPad + 24 }]}>
          <Text style={[styles.scanTitle, { color: colors.text }]}>Scan any UPI QR code</Text>
          <Text style={[styles.scanSub, { color: colors.mutedForeground }]}>
            Vault reads merchant details and launches Google Pay, PhonePe, or Paytm. We never process payments.
          </Text>

          {Platform.OS !== "web" && permission?.granted ? (
            <View style={styles.cameraWrap}>
              <CameraView
                style={styles.camera}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => handleScan(data)}
              />
              <View style={styles.scanOverlay}>
                <View style={styles.scanCornerTL} />
                <View style={styles.scanCornerTR} />
                <View style={styles.scanCornerBL} />
                <View style={styles.scanCornerBR} />
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
                <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                  <Text style={styles.permissionBtnText}>Allow Camera</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {!!errorMsg && (
            <View style={styles.errorRow}>
              <Feather name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <TouchableOpacity style={styles.demoBtn} onPress={handleSimulateScan}>
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.demoBtnGrad}>
              <Feather name="maximize" size={18} color="#fff" />
              <Text style={styles.demoBtnText}>Simulate UPI QR Scan (Demo)</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.manualLink, { borderColor: colors.border }]}
            onPress={() => router.push("/send")}
          >
            <Feather name="edit-3" size={16} color={colors.primary} />
            <Text style={[styles.manualLinkText, { color: colors.primary }]}>Enter UPI ID manually</Text>
          </TouchableOpacity>
        </View>
      )}

      {(step === "details" || step === "launch" || step === "launched") && parsedQr && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[styles.detailsContent, { paddingBottom: bottomPad + 32 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.merchantCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.merchantIcon, { backgroundColor: "#FF6B0015" }]}>
              <Feather name="shopping-bag" size={22} color="#FF6B00" />
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
          </View>

          {step !== "launched" && (
            <>
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
                  selectionColor="#FF6B00"
                />
              </View>

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
                  selectionColor="#FF6B00"
                />
              </View>

              {!!errorMsg && (
                <View style={styles.errorRow}>
                  <Feather name="alert-circle" size={14} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}
            </>
          )}

          {step === "details" && (
            <TouchableOpacity
              style={[styles.continueBtn, { opacity: amount ? 1 : 0.5 }]}
              onPress={handleContinueToLaunch}
              disabled={!amount}
            >
              <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.continueBtnGrad}>
                <Feather name="shield" size={18} color="#fff" />
                <Text style={styles.continueBtnText}>Verify & Choose UPI App</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {step === "launch" && launchRequest && (
            <PaymentAppButtons request={launchRequest} onLaunched={handleLaunched} />
          )}

          {step === "launched" && launchedApp && (
            <View style={styles.launchedCard}>
              <View style={[styles.launchedIcon, { backgroundColor: "#22C55E20" }]}>
                <Feather name="external-link" size={28} color="#22C55E" />
              </View>
              <Text style={[styles.launchedTitle, { color: colors.text }]}>Payment Launched</Text>
              <Text style={[styles.launchedSub, { color: colors.mutedForeground }]}>
                Complete ₹{Number.parseFloat(amount).toLocaleString("en-IN")} in{" "}
                {launchedApp === "google_pay" ? "Google Pay" : launchedApp === "phonepe" ? "PhonePe" : "Paytm"}.
                Vault recorded this launch in your history.
              </Text>
              <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.doneBtnGrad}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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
    borderColor: "#FF6B00",
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
    borderColor: "#FF6B00",
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
    borderColor: "#FF6B00",
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
    borderColor: "#FF6B00",
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
    backgroundColor: "#FF6B00",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  permissionBtnText: { color: "#fff", fontWeight: "700" },
  demoBtn: { borderRadius: 16, overflow: "hidden" },
  demoBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  demoBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
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
  errorText: { color: "#EF4444", fontSize: 13 },
  continueBtn: { borderRadius: 16, overflow: "hidden", marginTop: 24 },
  continueBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  continueBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
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
  doneBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
});
