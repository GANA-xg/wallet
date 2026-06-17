import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GradientCard } from "@/components/GradientCard";
import { SectionHeader } from "@/components/SectionHeader";
import { TransactionItem } from "@/components/TransactionItem";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { VaultCard } from "@/types";

const { width } = Dimensions.get("window");

const CARD_GRADIENTS: [string, string][] = [
  ["#1a1a2e", "#16213e"],
  ["#0a1628", "#1a2f4e"],
  ["#1a0a28", "#2e0d4e"],
  ["#0a1a10", "#0d3318"],
];

const CARD_TYPES: VaultCard["type"][] = ["visa", "mastercard", "rupay"];

function formatBalance(n: number) {
  return n.toLocaleString("en-IN");
}

export default function CardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { cards, toggleFreeze, removeCard, addCard, transactions } = useWallet();
  const [activeIdx, setActiveIdx] = useState(0);
  const [showAddCard, setShowAddCard] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const activeCard = cards[activeIdx];
  const cardTx = transactions.filter((_, i) => i < 5);

  const handleFreeze = () => {
    if (!activeCard) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    toggleFreeze(activeCard.id);
  };

  const handleDelete = () => {
    if (!activeCard) return;
    Alert.alert("Remove Card", `Remove ${activeCard.bank}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          removeCard(activeCard.id);
          setActiveIdx(Math.max(0, activeIdx - 1));
        },
      },
    ]);
  };

  const handleAddCard = () => {
    const newCard: VaultCard = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      name: "Aryan Sharma",
      number: `4${Math.floor(Math.random() * 900 + 100)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)} ${Math.floor(Math.random() * 9000 + 1000)}`,
      expiry: "12/29",
      cvv: `${Math.floor(Math.random() * 900 + 100)}`,
      type: CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)],
      gradientColors: CARD_GRADIENTS[Math.floor(Math.random() * CARD_GRADIENTS.length)],
      balance: Math.floor(Math.random() * 50000 + 5000),
      frozen: false,
      bank: "Axis Neo",
    };
    addCard(newCard);
    setShowAddCard(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>My Cards</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAddCard(true)}
        >
          <Feather name="plus" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {cards.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
          <Feather name="credit-card" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No cards yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Add your first card to get started
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddCard(true)}
          >
            <Text style={styles.emptyBtnText}>Add Card</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* Active Card Display */}
          <View style={styles.cardSection}>
            <GradientCard card={cards[activeIdx] ?? cards[0]} style={styles.mainCard} />
          </View>

          {/* Card Selector Dots */}
          <View style={styles.dots}>
            {cards.map((_, i) => (
              <TouchableOpacity key={i} onPress={() => setActiveIdx(i)}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: i === activeIdx ? colors.primary : colors.border },
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Card Balance */}
          {activeCard && (
            <View style={[styles.balanceRow, { backgroundColor: colors.surface }]}>
              <View>
                <Text style={[styles.balLabel, { color: colors.mutedForeground }]}>
                  Available Balance
                </Text>
                <Text style={[styles.balAmount, { color: colors.text }]}>
                  ₹{formatBalance(activeCard.balance)}
                </Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: activeCard.frozen ? "#1a0808" : "#0a1a10" }]}>
                <Feather
                  name={activeCard.frozen ? "lock" : "check-circle"}
                  size={12}
                  color={activeCard.frozen ? colors.error : colors.success}
                />
                <Text style={[styles.statusText, { color: activeCard.frozen ? colors.error : colors.success }]}>
                  {activeCard.frozen ? "Frozen" : "Active"}
                </Text>
              </View>
            </View>
          )}

          {/* Card Actions */}
          <View style={styles.actions}>
            {[
              {
                icon: activeCard?.frozen ? "unlock" : "lock",
                label: activeCard?.frozen ? "Unfreeze" : "Freeze",
                action: handleFreeze,
                color: colors.warning,
              },
              { icon: "bar-chart-2", label: "Statements", action: () => {}, color: colors.primary },
              { icon: "settings", label: "Settings", action: () => {}, color: colors.mutedForeground },
              {
                icon: "trash-2",
                label: "Remove",
                action: handleDelete,
                color: colors.error,
              },
            ].map((item, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.action, { backgroundColor: colors.surface }]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <Feather name={item.icon as keyof typeof Feather.glyphMap} size={20} color={item.color} />
                <Text style={[styles.actionLabel, { color: colors.mutedForeground }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Recent Transactions */}
          <View style={styles.txSection}>
            <SectionHeader title="Recent Transactions" />
            <View style={[styles.txCard, { backgroundColor: colors.surface }]}>
              {cardTx.map((tx) => (
                <TransactionItem key={tx.id} transaction={tx} />
              ))}
            </View>
          </View>
        </>
      )}

      {/* Add Card Sheet */}
      {showAddCard && (
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Add New Card</Text>
          <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>
            A new Axis Neo card will be added to your wallet
          </Text>
          <TouchableOpacity style={styles.sheetBtn} onPress={handleAddCard} activeOpacity={0.85}>
            <LinearGradient colors={["#FF6B00", "#FF9240"]} style={styles.sheetBtnGrad}>
              <Feather name="plus" size={18} color="#fff" />
              <Text style={styles.sheetBtnText}>Add Card</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: colors.border }]}
            onPress={() => setShowAddCard(false)}
          >
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: { fontSize: 28, fontWeight: "800" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  cardSection: { marginBottom: 16, alignItems: "center" },
  mainCard: { width: width - 40, height: (width - 40) * 0.58 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 20,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  balLabel: { fontSize: 12, fontWeight: "500", marginBottom: 4 },
  balAmount: { fontSize: 24, fontWeight: "800" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  action: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  actionLabel: { fontSize: 11, fontWeight: "500" },
  txSection: { marginBottom: 0 },
  txCard: { borderRadius: 20, paddingHorizontal: 16 },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 20,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center" },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  emptyBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  sheet: {
    marginTop: 20,
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#262B36",
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 20, fontWeight: "800" },
  sheetSub: { fontSize: 14, textAlign: "center" },
  sheetBtn: { width: "100%", borderRadius: 14, overflow: "hidden", marginTop: 8 },
  sheetBtnGrad: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
  },
  sheetBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  cancelBtn: { width: "100%", borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 16, fontWeight: "600" },
});
