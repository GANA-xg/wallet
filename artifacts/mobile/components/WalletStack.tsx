import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { VaultCard } from "@/types";

const { width } = Dimensions.get("window");
const CARD_W = width - 48;
const CARD_H = CARD_W * 0.58;
const PEEK = 72;
const GAP = 14;

function maskNumber(num: string) {
  const parts = num.split(" ");
  return parts.map((p, i) => (i < parts.length - 1 ? "••••" : p)).join("  ");
}

function CardTypeLogo({ type }: { type: VaultCard["type"] }) {
  if (type === "visa") return <Text style={styles.visaText}>VISA</Text>;
  if (type === "mastercard") {
    return (
      <View style={{ flexDirection: "row" }}>
        <View style={[styles.mcCircle, { backgroundColor: "#EB001B", marginRight: -10 }]} />
        <View style={[styles.mcCircle, { backgroundColor: "#F79E1B" }]} />
      </View>
    );
  }
  return <Text style={styles.rupayText}>RuPay</Text>;
}

interface CardItemProps {
  card: VaultCard;
  index: number;
  totalCards: number;
  expandedAnim: Animated.Value;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
}

function CardItem({ card, index, totalCards, expandedAnim, isSelected, onSelect, onDeselect }: CardItemProps) {
  const [showCVV, setShowCVV] = useState(false);

  const topAnim = expandedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [index * PEEK, index * (CARD_H + GAP)],
  });

  const scaleAnim = expandedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1 - index * 0.03, 1],
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        {
          top: topAnim,
          transform: [{ scaleX: scaleAnim }],
          zIndex: totalCards - index,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (isSelected) onDeselect();
          else onSelect();
        }}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={card.gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, isSelected && styles.cardSelected]}
        >
          {card.frozen && (
            <View style={styles.frozenBanner}>
              <Feather name="lock" size={11} color="#fff" />
              <Text style={styles.frozenText}>FROZEN</Text>
            </View>
          )}

          <View style={styles.cardTop}>
            <Text style={styles.bankName}>{card.bank}</Text>
            <CardTypeLogo type={card.type} />
          </View>

          <View style={styles.chip} />
          <Text style={styles.cardNum}>{maskNumber(card.number)}</Text>

          <View style={styles.cardBottom}>
            <View>
              <Text style={styles.cardLabel}>CARD HOLDER</Text>
              <Text style={styles.cardValue}>{card.name}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>EXPIRES</Text>
              <Text style={styles.cardValue}>{card.expiry}</Text>
            </View>
            <View>
              <Text style={styles.cardLabel}>CVV</Text>
              <TouchableOpacity onPress={() => setShowCVV(!showCVV)}>
                <Text style={styles.cardValue}>{showCVV ? card.cvv : "•••"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Balance overlay */}
          <View style={styles.balanceTag}>
            <Text style={styles.balanceText}>₹{card.balance.toLocaleString("en-IN")}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  cards: VaultCard[];
  onToggleFreeze: (id: string) => void;
  onRemove: (id: string) => void;
}

export function WalletStack({ cards, onToggleFreeze, onRemove }: Props) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const expandedAnim = useRef(new Animated.Value(0)).current;

  const totalHeight = expandedAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      CARD_H + Math.max(0, cards.length - 1) * PEEK,
      cards.length * (CARD_H + GAP),
    ],
  });

  const toggleExpanded = () => {
    const toValue = expanded ? 0 : 1;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(expandedAnim, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
    setExpanded(!expanded);
    if (expanded) setSelectedId(null);
  };

  const selectedCard = cards.find((c) => c.id === selectedId);

  if (cards.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.surface }]}>
        <Feather name="credit-card" size={32} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No cards yet</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle button */}
      <TouchableOpacity style={styles.toggleBtn} onPress={toggleExpanded}>
        <Text style={[styles.toggleText, { color: colors.primary }]}>
          {expanded ? "Collapse stack" : `${cards.length} cards · tap to expand`}
        </Text>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.primary}
        />
      </TouchableOpacity>

      {/* Cards stack */}
      <Animated.View style={[styles.stack, { height: totalHeight }]}>
        {cards.map((card, i) => (
          <CardItem
            key={card.id}
            card={card}
            index={i}
            totalCards={cards.length}
            expandedAnim={expandedAnim}
            isSelected={selectedId === card.id}
            onSelect={() => {
              if (!expanded) toggleExpanded();
              setSelectedId(card.id);
            }}
            onDeselect={() => setSelectedId(null)}
          />
        ))}
      </Animated.View>

      {/* Selected card actions */}
      {selectedCard && (
        <View style={[styles.actions, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.actionBalance}>
            <Text style={[styles.actionBalLabel, { color: colors.mutedForeground }]}>Available</Text>
            <Text style={[styles.actionBalAmount, { color: colors.text }]}>
              ₹{selectedCard.balance.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.actionBtns}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: selectedCard.frozen ? "#0a1a10" : "#1a0808" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onToggleFreeze(selectedCard.id);
              }}
            >
              <Feather
                name={selectedCard.frozen ? "unlock" : "lock"}
                size={16}
                color={selectedCard.frozen ? "#22C55E" : "#EF4444"}
              />
              <Text style={[styles.actionBtnText, { color: selectedCard.frozen ? "#22C55E" : "#EF4444" }]}>
                {selectedCard.frozen ? "Unfreeze" : "Freeze"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.muted }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Feather name="bar-chart-2" size={16} color={colors.primary} />
              <Text style={[styles.actionBtnText, { color: colors.primary }]}>Statement</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#1a0808" }]}
              onPress={() => onRemove(selectedCard.id)}
            >
              <Feather name="trash-2" size={16} color="#EF4444" />
              <Text style={[styles.actionBtnText, { color: "#EF4444" }]}>Remove</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: selectedCard.frozen ? "#EF4444" : "#22C55E" }]} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              {selectedCard.frozen ? "Card frozen — no transactions allowed" : "Card active · NFC enabled"}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 12,
    alignSelf: "flex-end",
  },
  toggleText: { fontSize: 13, fontWeight: "600" },
  stack: {
    width: "100%",
    position: "relative",
    marginBottom: 16,
  },
  cardWrapper: {
    position: "absolute",
    left: 0,
    width: "100%",
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    padding: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cardSelected: {
    shadowOpacity: 0.7,
    shadowRadius: 24,
    elevation: 20,
  },
  frozenBanner: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  frozenText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bankName: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  visaText: { color: "#fff", fontSize: 18, fontWeight: "900", fontStyle: "italic" },
  rupayText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  mcCircle: { width: 22, height: 22, borderRadius: 11 },
  chip: { width: 34, height: 24, borderRadius: 4, backgroundColor: "rgba(255,215,100,0.5)", borderWidth: 1, borderColor: "rgba(255,215,100,0.6)", marginBottom: 10 },
  cardNum: { color: "#fff", fontSize: 14, fontWeight: "500", letterSpacing: 3, marginBottom: 14 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { color: "rgba(255,255,255,0.5)", fontSize: 8, fontWeight: "700", letterSpacing: 1, marginBottom: 2 },
  cardValue: { color: "#fff", fontSize: 11, fontWeight: "600" },
  balanceTag: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  balanceText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  actions: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 4,
  },
  actionBalance: { alignItems: "center", gap: 2 },
  actionBalLabel: { fontSize: 11, fontWeight: "600" },
  actionBalAmount: { fontSize: 28, fontWeight: "800" },
  actionBtns: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: "600" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, flex: 1 },
  empty: { padding: 40, borderRadius: 20, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 15 },
});
