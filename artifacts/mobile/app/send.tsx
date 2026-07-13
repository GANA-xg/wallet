import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { isValidUpiId } from "@/services/payment/UpiQrParser";
import type { UpiAppId } from "@/services/payment/types";
import type { Transaction } from "@/types";

type Step = "details" | "launch" | "launched";

const QUICK_CONTACTS = [
  { name: "Rahul Kumar", upi: "rahul@paytm", initials: "RK", color: "#3B82F6" },
  { name: "Priya Singh", upi: "priya@gpay", initials: "PS", color: "#8B5CF6" },
  { name: "Amit Gupta", upi: "amit.gupta@icici", initials: "AG", color: "#22C55E" },
  { name: "Sneha Patel", upi: "sneha@sbi", initials: "SP", color: "#F59E0B" },
];

export default function SendScreen() {
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

  const [step, setStep] = useState<Step>("details");
  const [recipient, setRecipient] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
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

  const handleContinue = async () => {
    const amt = Number.parseFloat(amount);
    if (!recipient.trim()) {
      setErrorMsg("Enter a UPI ID");
      return;
    }
    if (!isValidUpiId(recipient.trim())) {
      setErrorMsg("Enter a valid UPI ID (e.g. name@bank)");
      return;
    }
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
      merchant: recipient,
      payeeAddress: recipient.trim(),
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
    const amt = Number.parseFloat(amount);
    const tx: Transaction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      amount: amt,
      type: "debit",
      category: "transfer",
      description: note || `Payment to ${recipient}`,
      date: new Date().toISOString(),
      status: "launched",
      merchant: recipient,
      payeeAddress: recipient.trim(),
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
          payeeAddress: recipient.trim(),
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Pay via UPI</Text>
        <TouchableOpacity onPress={() => router.replace("/pay" as never)}>
          <Feather name="maximize" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.formContent, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.infoBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="shield" size={16} color="#22C55E" />
          <Text style={[styles.infoBannerText, { color: colors.mutedForeground }]}>
            Vault launches Google Pay, PhonePe, or Paytm. We never store bank accounts, UPI PINs, or process payments.
          </Text>
        </View>

        {step !== "launched" && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>RECENT CONTACTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
              {QUICK_CONTACTS.map((c) => (
                <TouchableOpacity
                  key={c.upi}
                  style={styles.contactChip}
                  onPress={() => {
                    setRecipient(c.upi);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <View style={[styles.contactAvatar, { backgroundColor: c.color }]}>
                    <Text style={styles.contactInitials}>{c.initials}</Text>
                  </View>
                  <Text style={[styles.contactName, { color: colors.text }]}>{c.name.split(" ")[0]}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>UPI ID</Text>
            <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Feather name="at-sign" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="merchant@upi"
                placeholderTextColor={colors.textTertiary}
                value={recipient}
                onChangeText={setRecipient}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={step === "details"}
                selectionColor={colors.primary}
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
                editable={step === "details"}
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
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Recipient</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{recipient}</Text>
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

            <View style={styles.quickAmounts}>
              {["100", "500", "1000", "2000"].map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.quickAmtBtn, { backgroundColor: amount === a ? colors.primary : colors.surface }]}
                  onPress={() => setAmount(a)}
                  disabled={step !== "details"}
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
                editable={step === "details"}
                selectionColor={colors.primary}
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
            style={[styles.continueBtn, { opacity: recipient && hasAmount && canAffordPayment(amountValue) ? 1 : 0.5 }]}
            onPress={handleContinue}
            disabled={!recipient || !hasAmount || !canAffordPayment(amountValue)}
          >
            <LinearGradient colors={[colors.primary, colors.primaryLight]} style={styles.continueBtnGrad}>
              <Feather name="shield" size={18} color="#fff" />
              <Text style={styles.continueBtnText}>Verify & Choose UPI App</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {step === "launch" && launchRequest && (
          <PaymentAppButtons request={launchRequest} onLaunched={handleLaunched} onLaunchFailed={handleLaunchFailed} />
        )}

        {step === "launched" && launchedApp && (
          <View style={styles.launchedCard}>
            <View style={[styles.launchedIcon, { backgroundColor: "#22C55E20" }]}>
              <Feather name="external-link" size={28} color="#22C55E" />
            </View>
            <Text style={[styles.launchedTitle, { color: colors.text }]}>Payment Launched</Text>
            <Text style={[styles.launchedSub, { color: colors.mutedForeground }]}>
              Complete ₹{Number.parseFloat(amount).toLocaleString("en-IN")} to {recipient} in{" "}
              {launchedApp === "google_pay" ? "Google Pay" : launchedApp === "phonepe" ? "PhonePe" : "Paytm"}.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <LinearGradient colors={["#F4F4F5", "#D4D4D8"]} style={styles.doneBtnGrad}>
                <Text style={styles.doneBtnText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  formContent: { paddingHorizontal: 24, gap: 0 },
  infoBanner: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  infoBannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 16 },
  contactsScroll: { marginBottom: 8 },
  contactChip: { alignItems: "center", marginRight: 16, gap: 6 },
  contactAvatar: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  contactInitials: { color: "#fff", fontSize: 16, fontWeight: "800" },
  contactName: { fontSize: 12, fontWeight: "500" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  input: { flex: 1, fontSize: 15 },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  rupeeText: { fontSize: 28, fontWeight: "800" },
  amountInput: { flex: 1, fontSize: 36, fontWeight: "800" },
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
  quickAmounts: { flexDirection: "row", gap: 8, marginBottom: 4 },
  quickAmtBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: "center" },
  quickAmtText: { fontSize: 13, fontWeight: "700" },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  errorText: { color: "#EF4444", fontSize: 13 },
  continueBtn: { borderRadius: 16, overflow: "hidden", marginTop: 20 },
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
