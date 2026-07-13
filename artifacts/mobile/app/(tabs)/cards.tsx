import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CardScanner from "@/components/CardScanner";
import OcrReviewSheet from "@/components/OcrReviewSheet";
import QualityFeedback from "@/components/QualityFeedback";
import { WalletStack } from "@/components/WalletStack";
import { useWallet } from "@/context/WalletContext";
import { useCardScanner } from "@/hooks/useCardScanner";
import { useColors } from "@/hooks/useColors";
import type { CardNetwork, CardRecord } from "@/types";
import { detectCardNetwork, luhnCheck, stripNumber, formatCardNumber } from "@/services/cards/validation";

const { width } = Dimensions.get("window");

const PRESET_GRADIENTS: { colors: [string, string]; label: string }[] = [
  { colors: ["#2a2a2a", "#222222"], label: "Graphite" },
  { colors: ["#252525", "#303030"], label: "Slate" },
  { colors: ["#202020", "#2a2a2a"], label: "Smoke" },
  { colors: ["#2b2b2b", "#1f1f1f"], label: "Ink" },
  { colors: ["#303030", "#252525"], label: "Stone" },
  { colors: ["#1f1f1f", "#2f2f2f"], label: "Charcoal" },
];

const CARD_NETWORKS: CardNetwork[] = ["visa", "mastercard", "rupay", "amex", "discover"];

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cards, toggleFreeze, removeCard, addCard } = useWallet();
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"scan" | "custom" | null>(null);
  const [customNickname, setCustomNickname] = useState("My Card");
  const [customIssuer, setCustomIssuer] = useState("");
  const [customNumber, setCustomNumber] = useState("");
  const [customMonth, setCustomMonth] = useState("");
  const [customYear, setCustomYear] = useState("");
  const [customGrad, setCustomGrad] = useState(0);
  const [customNetwork, setCustomNetwork] = useState<CardNetwork>("visa");
  const [customError, setCustomError] = useState<string | null>(null);

  const scanner = useCardScanner(cards);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleRemove = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    Alert.alert("Remove Card", `Remove ${card.nickname}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeCard(id) },
    ]);
  };

  const handleStartScan = () => {
    setAddMode("scan");
    scanner.startScan();
  };

  const handleScanCapture = (imagePath: string) => {
    scanner.onImageCaptured(imagePath);
  };

  const handleScanConfirm = async (overrides?: { nickname?: string; theme?: { gradientColors: string[] } }) => {
    const card = await scanner.confirmCard(overrides);
    if (card) {
      addCard(card);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAdd(false);
      setAddMode(null);
      scanner.reset();
    }
  };

  const handleScanCancel = () => {
    scanner.cancelScan();
    setAddMode(null);
  };

  const handleCustomAdd = () => {
    setCustomError(null);

    const cleaned = stripNumber(customNumber);
    if (!cleaned || cleaned.length < 13) {
      setCustomError("Enter a valid card number (13-19 digits)");
      return;
    }
    if (!luhnCheck(cleaned)) {
      setCustomError("Card number failed checksum validation");
      return;
    }

    const month = parseInt(customMonth, 10);
    const year = parseInt(customYear, 10);
    if (!month || month < 1 || month > 12) {
      setCustomError("Enter a valid expiry month (1-12)");
      return;
    }
    if (!year || year < 2024) {
      setCustomError("Enter a valid expiry year");
      return;
    }

    const { network: detectedNetwork } = detectCardNetwork(cleaned);
    const lastFour = cleaned.slice(-4);
    const now = new Date().toISOString();

    const newCard: CardRecord = {
      id: `card_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId: "local",
      cardNetwork: detectedNetwork,
      issuer: customIssuer || null,
      lastFour,
      expiryMonth: month,
      expiryYear: year,
      nickname: customNickname || `${detectedNetwork.charAt(0).toUpperCase() + detectedNetwork.slice(1)} •••• ${lastFour}`,
      theme: { gradientColors: PRESET_GRADIENTS[customGrad].colors },
      frozen: false,
      balance: 0,
      createdAt: now,
      updatedAt: now,
    };

    addCard(newCard);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetCustomForm();
  };

  const resetCustomForm = () => {
    setShowAdd(false);
    setAddMode(null);
    setCustomNickname("My Card");
    setCustomIssuer("");
    setCustomNumber("");
    setCustomMonth("");
    setCustomYear("");
    setCustomGrad(0);
    setCustomNetwork("visa");
    setCustomError(null);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>My Cards</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>
            {cards.length} card{cards.length !== 1 ? "s" : ""} · tap to expand
          </Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.nfcBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}
            onPress={() => router.push("/nfc-pay")}
          >
            <Feather name="wifi" size={16} color={colors.primary} />
            <Text style={[styles.nfcText, { color: colors.primary }]}>NFC Pay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setShowAdd(!showAdd); setAddMode(null); }}
          >
            <Feather name={showAdd ? "x" : "plus"} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Wallet Stack */}
      <WalletStack
        cards={cards}
        onToggleFreeze={toggleFreeze}
        onRemove={handleRemove}
      />

      {/* Add Card Flow */}
      {showAdd && !addMode && (
        <View style={styles.addSection}>
          <Text style={[styles.addTitle, { color: colors.text }]}>Add a Card</Text>
          <View style={styles.addMethods}>
            <TouchableOpacity
              style={[styles.addMethod, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleStartScan}
            >
              <View style={[styles.addMethodIcon, { backgroundColor: "#3B82F620" }]}>
                <Feather name="camera" size={24} color="#3B82F6" />
              </View>
              <Text style={[styles.addMethodTitle, { color: colors.text }]}>Scan Card</Text>
              <Text style={[styles.addMethodSub, { color: colors.mutedForeground }]}>
                Use camera to detect card details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addMethod, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setAddMode("custom")}
            >
              <View style={[styles.addMethodIcon, { backgroundColor: colors.surfaceElevated }]}>
                <Feather name="edit-3" size={24} color={colors.primary} />
              </View>
              <Text style={[styles.addMethodTitle, { color: colors.text }]}>Custom Card</Text>
              <Text style={[styles.addMethodSub, { color: colors.mutedForeground }]}>
                Enter card details manually
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scan mode */}
      {addMode === "scan" && scanner.session.state === "idle" && (
        <View style={[styles.scanLoading, { backgroundColor: colors.surface }]}>
          <Text style={[styles.scanLoadingText, { color: colors.mutedForeground }]}>
            Initializing camera...
          </Text>
        </View>
      )}

      {addMode === "scan" && scanner.session.state === "ready" && (
        <CardScanner
          onCapture={handleScanCapture}
          onCancel={handleScanCancel}
        />
      )}

      {addMode === "scan" && (scanner.session.state === "capturing" || scanner.session.state === "processing" || scanner.session.state === "quality_check") && (
        <View style={[styles.scanLoading, { backgroundColor: colors.surface }]}>
          <Text style={[styles.scanLoadingText, { color: colors.mutedForeground }]}>
            {scanner.session.state === "capturing" ? "Capturing..." : "Analyzing card..."}
          </Text>
        </View>
      )}

      {addMode === "scan" && scanner.session.state === "quality_failed" && scanner.session.error && (
        <QualityFeedback
          error={scanner.session.error}
          onRetake={scanner.retake}
          onCancel={handleScanCancel}
        />
      )}

      {addMode === "scan" && scanner.session.state === "error" && scanner.session.error && (
        <View style={[styles.errorBlock, { backgroundColor: colors.surface }]}>
          <View style={[styles.errorIconBox, { backgroundColor: "#EF444420" }]}>
            <Feather name="alert-circle" size={28} color="#EF4444" />
          </View>
          <Text style={[styles.errorTitle, { color: colors.text }]}>Scan Failed</Text>
          <Text style={[styles.errorMessage, { color: colors.mutedForeground }]}>
            {scanner.session.error.message}
          </Text>
          <View style={styles.errorActions}>
            {scanner.session.error.retryable && (
              <TouchableOpacity
                style={[styles.errorRetryBtn, { backgroundColor: colors.primary }]}
                onPress={scanner.retake}
              >
                <Text style={styles.errorRetryBtnText}>Try Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleScanCancel}>
              <Text style={[styles.errorCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {addMode === "scan" && scanner.session.state === "review" && scanner.session.reviewData && (
        <OcrReviewSheet
          data={scanner.session.reviewData}
          onConfirm={handleScanConfirm}
          onCancel={handleScanCancel}
        />
      )}

      {addMode === "scan" && scanner.session.state === "done" && (
        <View style={[styles.doneBlock, { backgroundColor: colors.surface }]}>
          <Feather name="check-circle" size={32} color="#22C55E" />
          <Text style={[styles.doneText, { color: colors.text }]}>Card added to wallet</Text>
        </View>
      )}

      {/* Custom card creator */}
      {addMode === "custom" && (
        <View style={[styles.creator, { backgroundColor: colors.surface }]}>
          <LinearGradient
            colors={PRESET_GRADIENTS[customGrad].colors}
            style={styles.previewCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.previewBank}>{customIssuer || "My Bank"}</Text>
            <Text style={styles.previewType}>{customNetwork.toUpperCase()}</Text>
            <Text style={styles.previewNum}>
              {customNumber ? formatCardNumber(customNumber) : "•••• •••• •••• 0000"}
            </Text>
            <Text style={styles.previewName}>
              {customMonth && customYear ? `${customMonth}/${customYear.slice(-2)}` : ""}
            </Text>
          </LinearGradient>

          <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Card Number</Text>
          <View style={[styles.creatorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <TextInput
              style={[styles.creatorInputText, { color: colors.text }]}
              value={customNumber}
              onChangeText={(t) => setCustomNumber(t.replace(/\D/g, ""))}
              placeholder="0000 0000 0000 0000"
              placeholderTextColor={colors.textTertiary}
              keyboardType="number-pad"
              maxLength={19}
            />
          </View>

          <View style={styles.creatorRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Expiry Month</Text>
              <View style={[styles.creatorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.creatorInputText, { color: colors.text }]}
                  value={customMonth}
                  onChangeText={setCustomMonth}
                  placeholder="MM"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Expiry Year</Text>
              <View style={[styles.creatorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.creatorInputText, { color: colors.text }]}
                  value={customYear}
                  onChangeText={setCustomYear}
                  placeholder="YYYY"
                  placeholderTextColor={colors.textTertiary}
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            </View>
          </View>

          <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Issuer / Bank Name</Text>
          <View style={[styles.creatorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <TextInput
              style={[styles.creatorInputText, { color: colors.text }]}
              value={customIssuer}
              onChangeText={setCustomIssuer}
              placeholder="HDFC Bank"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Nickname</Text>
          <View style={[styles.creatorInput, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <TextInput
              style={[styles.creatorInputText, { color: colors.text }]}
              value={customNickname}
              onChangeText={setCustomNickname}
              placeholder="My Card"
              placeholderTextColor={colors.textTertiary}
            />
          </View>

          <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Color Theme</Text>
          <View style={styles.gradRow}>
            {PRESET_GRADIENTS.map((g, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCustomGrad(i)}
                style={[styles.gradSwatch, { borderWidth: customGrad === i ? 2 : 0, borderColor: colors.primary }]}
              >
                <LinearGradient colors={g.colors} style={styles.gradSwatchGrad} />
              </TouchableOpacity>
            ))}
          </View>

          {customError && (
            <Text style={styles.customErrorText}>{customError}</Text>
          )}

          <TouchableOpacity style={styles.createBtn} onPress={handleCustomAdd}>
            <LinearGradient colors={[colors.primary, "#d9d9d9"]} style={styles.createBtnGrad}>
              <Text style={styles.createBtnText}>Add to Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={resetCustomForm} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transport passes teaser */}
      <TouchableOpacity
        style={[styles.transportTeaser, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push("/transport")}
      >
        <View style={[styles.transportIcon, { backgroundColor: colors.surfaceElevated }]}>
          <Feather name="map" size={20} color={colors.success} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.transportTitle, { color: colors.text }]}>Transport Wallet</Text>
          <Text style={[styles.transportSub, { color: colors.mutedForeground }]}>
            Metro, Bus & Student Passes
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800" },
  sub: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  nfcBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  nfcText: { fontSize: 13, fontWeight: "700" },
  addBtn: { width: 38, height: 38, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  addSection: { marginBottom: 20 },
  addTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  addMethods: { flexDirection: "row", gap: 12 },
  addMethod: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  addMethodIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  addMethodTitle: { fontSize: 14, fontWeight: "700", textAlign: "center" },
  addMethodSub: { fontSize: 12, textAlign: "center" },
  scanLoading: { borderRadius: 20, padding: 40, marginBottom: 20, alignItems: "center" },
  scanLoadingText: { fontSize: 14 },
  errorBlock: { borderRadius: 20, padding: 24, gap: 12, marginBottom: 20, alignItems: "center" },
  errorIconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: "center", alignItems: "center" },
  errorTitle: { fontSize: 17, fontWeight: "700" },
  errorMessage: { fontSize: 13, textAlign: "center", lineHeight: 18 },
  errorActions: { gap: 8, alignItems: "center" },
  errorRetryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errorRetryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  errorCancelText: { fontSize: 14, paddingVertical: 8 },
  doneBlock: { borderRadius: 20, padding: 32, marginBottom: 20, alignItems: "center", gap: 8 },
  doneText: { fontSize: 16, fontWeight: "700" },
  creator: { borderRadius: 20, padding: 20, gap: 12, marginBottom: 20 },
  previewCard: { borderRadius: 18, padding: 20, height: 160, justifyContent: "space-between", marginBottom: 4 },
  previewBank: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  previewType: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 2, alignSelf: "flex-end" },
  previewNum: { color: "rgba(255,255,255,0.8)", fontSize: 14, letterSpacing: 3 },
  previewName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  creatorLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  creatorInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  creatorInputText: { fontSize: 15 },
  creatorRow: { flexDirection: "row", gap: 12 },
  gradRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  gradSwatch: { width: 44, height: 44, borderRadius: 12, overflow: "hidden", padding: 2 },
  gradSwatchGrad: { flex: 1, borderRadius: 10 },
  customErrorText: { color: "#EF4444", fontSize: 13, textAlign: "center" },
  createBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  createBtnGrad: { paddingVertical: 14, alignItems: "center" },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelLink: { paddingVertical: 8, alignItems: "center" },
  cancelLinkText: { fontSize: 14 },
  transportTeaser: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  transportIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  transportTitle: { fontSize: 15, fontWeight: "700" },
  transportSub: { fontSize: 12, marginTop: 2 },
});
