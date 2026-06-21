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

import { WalletStack } from "@/components/WalletStack";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { VaultCard } from "@/types";

const { width } = Dimensions.get("window");

const CARD_GRADIENTS: [string, string][] = [
  ["#1a1a2e", "#16213e"],
  ["#0a1628", "#1a2f4e"],
  ["#1a0a28", "#2e0d4e"],
  ["#0a1a10", "#0d3318"],
  ["#2e1a00", "#4e2d00"],
];

const CARD_TYPES: VaultCard["type"][] = ["visa", "mastercard", "rupay"];

const PRESET_GRADIENTS: { colors: [string, string]; label: string }[] = [
  { colors: ["#1a1a2e", "#16213e"], label: "Navy" },
  { colors: ["#1a0a28", "#2e0d4e"], label: "Violet" },
  { colors: ["#0a1a10", "#0d3318"], label: "Forest" },
  { colors: ["#2e1a00", "#4e2d00"], label: "Ember" },
  { colors: ["#1a0808", "#3d0f0f"], label: "Rouge" },
  { colors: ["#0a1628", "#1a2f4e"], label: "Ocean" },
];

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cards, toggleFreeze, removeCard, addCard } = useWallet();
  const [showAdd, setShowAdd] = useState(false);
  const [addMode, setAddMode] = useState<"scan" | "custom" | null>(null);
  const [customName, setCustomName] = useState("My Card");
  const [customBank, setCustomBank] = useState("My Bank");
  const [customGrad, setCustomGrad] = useState(0);
  const [customType, setCustomType] = useState<VaultCard["type"]>("visa");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleRemove = (id: string) => {
    const card = cards.find((c) => c.id === id);
    if (!card) return;
    Alert.alert("Remove Card", `Remove ${card.bank}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => removeCard(id),
      },
    ]);
  };

  const handleAddCustom = () => {
    const newCard: VaultCard = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name: "Aryan Sharma",
      number: `4${Array.from({ length: 3 }, () => Math.floor(Math.random() * 9000 + 1000)).join(" ")} ${Math.floor(Math.random() * 9000 + 1000)}`,
      expiry: "12/29",
      cvv: `${Math.floor(Math.random() * 900 + 100)}`,
      type: customType,
      gradientColors: PRESET_GRADIENTS[customGrad].colors,
      balance: Math.floor(Math.random() * 50000 + 5000),
      frozen: false,
      bank: customBank || "Custom Bank",
    };
    addCard(newCard);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setAddMode(null);
    setCustomName("My Card");
    setCustomBank("My Bank");
  };

  const simulateScan = () => {
    const newCard: VaultCard = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      name: "Aryan Sharma",
      number: "4111 1111 1111 1111",
      expiry: "08/28",
      cvv: "737",
      type: "visa",
      gradientColors: CARD_GRADIENTS[Math.floor(Math.random() * CARD_GRADIENTS.length)],
      balance: Math.floor(Math.random() * 40000 + 5000),
      frozen: false,
      bank: "Scanned Card",
    };
    addCard(newCard);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowAdd(false);
    setAddMode(null);
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
            style={[styles.nfcBtn, { backgroundColor: "#FF6B0020" }]}
            onPress={() => router.push("/nfc-pay")}
          >
            <Feather name="wifi" size={16} color="#FF6B00" />
            <Text style={[styles.nfcText, { color: "#FF6B00" }]}>NFC Pay</Text>
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
              onPress={() => setAddMode("scan")}
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
              <View style={[styles.addMethodIcon, { backgroundColor: "#FF6B0020" }]}>
                <Feather name="edit-3" size={24} color="#FF6B00" />
              </View>
              <Text style={[styles.addMethodTitle, { color: colors.text }]}>Custom Card</Text>
              <Text style={[styles.addMethodSub, { color: colors.mutedForeground }]}>
                Create a custom branded card
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Scan simulation */}
      {addMode === "scan" && (
        <View style={[styles.scanView, { backgroundColor: colors.surface }]}>
          <View style={styles.scanViewport}>
            <View style={styles.scanCornerTL} />
            <View style={styles.scanCornerTR} />
            <View style={styles.scanCornerBL} />
            <View style={styles.scanCornerBR} />
            <Feather name="credit-card" size={48} color="rgba(255,255,255,0.3)" />
            <Text style={styles.scanPrompt}>Position your card within the frame</Text>
          </View>
          <TouchableOpacity style={styles.scanSimBtn} onPress={simulateScan}>
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.scanSimGrad}>
              <Feather name="zap" size={16} color="#fff" />
              <Text style={styles.scanSimText}>Simulate Scan (Demo)</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddMode(null)} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom card creator */}
      {addMode === "custom" && (
        <View style={[styles.creator, { backgroundColor: colors.surface }]}>
          {/* Preview */}
          <LinearGradient
            colors={PRESET_GRADIENTS[customGrad].colors}
            style={styles.previewCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.previewBank}>{customBank || "My Bank"}</Text>
            <Text style={styles.previewType}>{customType.toUpperCase()}</Text>
            <Text style={styles.previewNum}>•••• •••• •••• 0000</Text>
            <Text style={styles.previewName}>Aryan Sharma</Text>
          </LinearGradient>

          <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Bank Name</Text>
          <View style={[styles.creatorInput, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <TextInput
              style={[styles.creatorInputText, { color: colors.text }]}
              value={customBank}
              onChangeText={setCustomBank}
              placeholder="Enter bank name"
              placeholderTextColor={colors.textTertiary}
              selectionColor={colors.primary}
            />
          </View>

          <Text style={[styles.creatorLabel, { color: colors.mutedForeground }]}>Card Type</Text>
          <View style={styles.typeRow}>
            {CARD_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeChip,
                  { backgroundColor: customType === t ? colors.primary : colors.muted, borderColor: colors.border },
                ]}
                onPress={() => setCustomType(t)}
              >
                <Text style={[styles.typeChipText, { color: customType === t ? "#fff" : colors.mutedForeground }]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
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

          <TouchableOpacity style={styles.createBtn} onPress={handleAddCustom}>
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.createBtnGrad}>
              <Text style={styles.createBtnText}>Add to Wallet</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAddMode(null)} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transport passes teaser */}
      <TouchableOpacity
        style={[styles.transportTeaser, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => router.push("/transport")}
      >
        <View style={[styles.transportIcon, { backgroundColor: "#22C55E20" }]}>
          <Feather name="map" size={20} color="#22C55E" />
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
  scanView: { borderRadius: 20, padding: 20, gap: 16, marginBottom: 20, alignItems: "center" },
  scanViewport: {
    width: "100%",
    height: 180,
    backgroundColor: "#000",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    position: "relative",
  },
  scanCornerTL: { position: "absolute", top: 12, left: 12, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: "#FF6B00", borderRadius: 4 },
  scanCornerTR: { position: "absolute", top: 12, right: 12, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: "#FF6B00", borderRadius: 4 },
  scanCornerBL: { position: "absolute", bottom: 12, left: 12, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: "#FF6B00", borderRadius: 4 },
  scanCornerBR: { position: "absolute", bottom: 12, right: 12, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: "#FF6B00", borderRadius: 4 },
  scanPrompt: { color: "rgba(255,255,255,0.5)", fontSize: 12, textAlign: "center" },
  scanSimBtn: { width: "100%", borderRadius: 14, overflow: "hidden" },
  scanSimGrad: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 14 },
  scanSimText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  cancelLink: { paddingVertical: 8 },
  cancelLinkText: { fontSize: 14 },
  creator: { borderRadius: 20, padding: 20, gap: 12, marginBottom: 20 },
  previewCard: { borderRadius: 18, padding: 20, height: 160, justifyContent: "space-between", marginBottom: 4 },
  previewBank: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600" },
  previewType: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 2, alignSelf: "flex-end" },
  previewNum: { color: "rgba(255,255,255,0.8)", fontSize: 14, letterSpacing: 3 },
  previewName: { color: "#fff", fontSize: 13, fontWeight: "700" },
  creatorLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  creatorInput: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1 },
  creatorInputText: { fontSize: 15 },
  typeRow: { flexDirection: "row", gap: 8 },
  typeChip: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center", borderWidth: 1 },
  typeChipText: { fontSize: 12, fontWeight: "700" },
  gradRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  gradSwatch: { width: 44, height: 44, borderRadius: 12, overflow: "hidden", padding: 2 },
  gradSwatchGrad: { flex: 1, borderRadius: 10 },
  createBtn: { borderRadius: 14, overflow: "hidden", marginTop: 4 },
  createBtnGrad: { paddingVertical: 14, alignItems: "center" },
  createBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
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
