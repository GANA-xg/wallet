import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { SkeletonCard } from "@/components/Skeleton";
import CardScanner from "@/components/CardScanner";
import OcrReviewSheet from "@/components/OcrReviewSheet";
import QualityFeedback from "@/components/QualityFeedback";
import { WalletStack } from "@/components/WalletStack";
import { useWallet } from "@/context/WalletContext";
import { useCardScanner } from "@/hooks/useCardScanner";
import { useColors } from "@/hooks/useColors";
import type { CardNetwork, CardRecord } from "@/types";
import { detectCardNetwork, luhnCheck, stripNumber, formatCardNumber } from "@/services/cards/validation";

const PRESET_GRADIENTS: { colors: [string, string]; label: string }[] = [
  { colors: ["#2A2520", "#1A1510"], label: "Graphite" },
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
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    Alert.alert("Remove Card", `Remove ${card.nickname}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeCard(id) },
    ]);
  };

  const handleStartScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        { paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 },
      ]}
      showsVerticalScrollIndicator={false}
      keyboardDismissMode="on-drag"
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
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
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push("/nfc-pay");
              }}
            >
              <Feather name="wifi" size={14} color={colors.primary} />
              <Text style={[styles.nfcText, { color: colors.primary }]}>NFC</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAdd(!showAdd);
                setAddMode(null);
              }}
            >
              <Feather name={showAdd ? "x" : "plus"} size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* Wallet Stack */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)}>
        {loading ? (
          <View style={styles.cardStrip}>
            <SkeletonCard />
          </View>
        ) : (
          <WalletStack
            cards={cards}
            onToggleFreeze={toggleFreeze}
            onRemove={handleRemove}
          />
        )}
      </Animated.View>

      {/* Add Card Flow */}
      {showAdd && !addMode && (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.addSection}>
          <Text style={[styles.addTitle, { color: colors.text }]}>Add a Card</Text>
          <View style={styles.addMethods}>
            <TouchableOpacity
              style={[styles.addMethod, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={handleStartScan}
              activeOpacity={0.8}
            >
              <View style={[styles.addMethodIcon, { backgroundColor: colors.sunsetLight + "40" }]}>
                <Feather name="camera" size={22} color={colors.secondary} />
              </View>
              <Text style={[styles.addMethodTitle, { color: colors.text }]}>Scan Card</Text>
              <Text style={[styles.addMethodSub, { color: colors.mutedForeground }]}>
                Camera detects details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addMethod, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setAddMode("custom");
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.addMethodIcon, { backgroundColor: colors.primaryLighter }]}>
                <Feather name="edit-3" size={22} color={colors.primary} />
              </View>
              <Text style={[styles.addMethodTitle, { color: colors.text }]}>Manual Entry</Text>
              <Text style={[styles.addMethodSub, { color: colors.mutedForeground }]}>
                Enter details yourself
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
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
        <CardScanner onCapture={handleScanCapture} onCancel={handleScanCancel} />
      )}

      {addMode === "scan" && (scanner.session.state === "capturing" || scanner.session.state === "processing" || scanner.session.state === "quality_check") && (
        <View style={[styles.scanLoading, { backgroundColor: colors.surface }]}>
          <Text style={[styles.scanLoadingText, { color: colors.mutedForeground }]}>
            {scanner.session.state === "capturing" ? "Capturing..." : "Analyzing card..."}
          </Text>
        </View>
      )}

      {addMode === "scan" && scanner.session.state === "quality_failed" && scanner.session.error && (
        <QualityFeedback error={scanner.session.error} onRetake={scanner.retake} onCancel={handleScanCancel} />
      )}

      {addMode === "scan" && scanner.session.state === "error" && scanner.session.error && (
        <View style={[styles.errorBlock, { backgroundColor: colors.surface }]}>
          <View style={[styles.errorIconBox, { backgroundColor: colors.error + "20" }]}>
            <Feather name="alert-circle" size={28} color={colors.error} />
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
        <OcrReviewSheet data={scanner.session.reviewData} onConfirm={handleScanConfirm} onCancel={handleScanCancel} />
      )}

      {addMode === "scan" && scanner.session.state === "done" && (
        <View style={[styles.doneBlock, { backgroundColor: colors.surface }]}>
          <Feather name="check-circle" size={32} color={colors.success} />
          <Text style={[styles.doneText, { color: colors.text }]}>Card added to wallet</Text>
        </View>
      )}

      {/* Custom card creator */}
      {addMode === "custom" && (
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.creator, { backgroundColor: colors.surface }]}>
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

          {customError && <Text style={styles.customErrorText}>{customError}</Text>}

          <TouchableOpacity style={styles.createBtn} onPress={handleCustomAdd} activeOpacity={0.8}>
            <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.createBtnGrad}>
              <Text style={styles.createBtnText}>Add to Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={resetCustomForm} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Transport passes teaser */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <TouchableOpacity
          style={[styles.transportTeaser, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/transport");
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.transportIcon, { backgroundColor: colors.successLight + "20" }]}>
            <Feather name="map" size={18} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.transportTitle, { color: colors.text }]}>Transport Wallet</Text>
            <Text style={[styles.transportSub, { color: colors.mutedForeground }]}>
              Metro, Bus & Student Passes
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontWeight: "800" },
  sub: { fontSize: 13, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  nfcBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  nfcText: { fontSize: 12, fontWeight: "700" },
  addBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  addSection: { marginBottom: 20 },
  addTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  addMethods: { flexDirection: "row", gap: 12 },
  addMethod: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: "center", gap: 8 },
  addMethodIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  addMethodTitle: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  addMethodSub: { fontSize: 11, textAlign: "center" },
  scanLoading: { borderRadius: 16, padding: 32, marginBottom: 20, alignItems: "center" },
  scanLoadingText: { fontSize: 13 },
  errorBlock: { borderRadius: 16, padding: 20, gap: 10, marginBottom: 20, alignItems: "center" },
  errorIconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  errorTitle: { fontSize: 16, fontWeight: "700" },
  errorMessage: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  errorActions: { gap: 8, alignItems: "center" },
  errorRetryBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  errorRetryBtnText: { color: "#FFFDF9", fontSize: 14, fontWeight: "700" },
  errorCancelText: { fontSize: 13, paddingVertical: 6 },
  doneBlock: { borderRadius: 16, padding: 28, marginBottom: 20, alignItems: "center", gap: 8 },
  doneText: { fontSize: 15, fontWeight: "700" },
  creator: { borderRadius: 20, padding: 18, gap: 10, marginBottom: 20 },
  previewCard: { borderRadius: 16, padding: 18, height: 150, justifyContent: "space-between", marginBottom: 4 },
  previewBank: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  previewType: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 2, alignSelf: "flex-end" },
  previewNum: { color: "rgba(255,255,255,0.8)", fontSize: 14, letterSpacing: 3 },
  previewName: { color: "#FFFDF9", fontSize: 12, fontWeight: "700" },
  creatorLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  creatorInput: { borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1 },
  creatorInputText: { fontSize: 14 },
  creatorRow: { flexDirection: "row", gap: 12 },
  gradRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  gradSwatch: { width: 40, height: 40, borderRadius: 10, overflow: "hidden", padding: 2 },
  gradSwatchGrad: { flex: 1, borderRadius: 8 },
  customErrorText: { color: "#D32F2F", fontSize: 12, textAlign: "center" },
  createBtn: { borderRadius: 12, overflow: "hidden", marginTop: 4 },
  createBtnGrad: { paddingVertical: 13, alignItems: "center" },
  createBtnText: { color: "#FFFDF9", fontSize: 15, fontWeight: "700" },
  cancelLink: { paddingVertical: 6, alignItems: "center" },
  cancelLinkText: { fontSize: 13 },
  transportTeaser: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 8,
  },
  transportIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  transportTitle: { fontSize: 14, fontWeight: "700" },
  transportSub: { fontSize: 12, marginTop: 2 },
  cardStrip: { gap: 12, paddingRight: 20 },
});
