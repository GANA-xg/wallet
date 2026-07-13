import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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
import type { CardNetwork, CardRecord } from "@/types";

const { width } = Dimensions.get("window");
const CARD_W = width - 48;
const CARD_H = CARD_W * 0.58;
const PEEK = 72;
const GAP = 14;

function formatExpiry(month: number, year: number): string {
  const m = String(month).padStart(2, "0");
  const y = String(year).slice(-2);
  return `${m}/${y}`;
}

function CardTypeLogo({ network }: { network: CardNetwork }) {
  if (network === "visa") return <Text style={styles.visaText}>VISA</Text>;
  if (network === "mastercard") {
    return (
      <View style={{ flexDirection: "row" }}>
        <View style={[styles.mcCircle, { backgroundColor: "#EB001B", marginRight: -10 }]} />
        <View style={[styles.mcCircle, { backgroundColor: "#F79E1B" }]} />
      </View>
    );
  }
  if (network === "rupay") return <Text style={styles.networkText}>RuPay</Text>;
  if (network === "amex") return <Text style={styles.networkText}>AMEX</Text>;
  if (network === "discover") return <Text style={styles.networkText}>Discover</Text>;
  return <Text style={styles.networkText}>CARD</Text>;
}

interface CardItemProps {
  card: CardRecord;
  index: number;
  totalCards: number;
  expandedAnim: Animated.Value;
  isSelected: boolean;
  onSelect: () => void;
  onDeselect: () => void;
}

function CardItem({ card, index, totalCards, expandedAnim, isSelected, onSelect, onDeselect }: CardItemProps) {
  const colors = useColors();

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
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: isSelected ? colors.primary : colors.border },
            isSelected && styles.cardSelected,
          ]}
        >
          {card.frozen && (
            <View style={styles.frozenBanner}>
              <Feather name="lock" size={11} color={colors.text} />
              <Text style={[styles.frozenText, { color: colors.text }]}>FROZEN</Text>
            </View>
          )}

          <View style={styles.cardTop}>
            <Text style={[styles.bankName, { color: colors.text }]}>{card.issuer ?? "Card"}</Text>
            <CardTypeLogo network={card.cardNetwork} />
          </View>

          <View style={[styles.chip, { backgroundColor: colors.primary + "12", borderColor: colors.border }]} />
          <Text style={[styles.cardNum, { color: colors.text }]}>•••• •••• •••• {card.lastFour}</Text>

          <View style={styles.cardBottom}>
            <View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>EXPIRES</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {formatExpiry(card.expiryMonth, card.expiryYear)}
              </Text>
            </View>
            <View>
              <Text style={[styles.cardLabel, { color: colors.mutedForeground }]}>NETWORK</Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {card.cardNetwork.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.balanceTag, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Text style={[styles.balanceText, { color: colors.text }]}>
              ₹{card.balance.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface Props {
  cards: CardRecord[];
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
  stack: { width: "100%", position: "relative", marginBottom: 16 },
  cardWrapper: { position: "absolute", left: 0, width: "100%" },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    padding: 20,
    overflow: "hidden",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  cardSelected: { shadowOpacity: 0.22, shadowRadius: 18, elevation: 6 },
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
  frozenText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  bankName: { fontSize: 12, fontWeight: "700" },
  visaText: { color: "#F5F5F5", fontSize: 18, fontWeight: "900", fontStyle: "italic" },
  networkText: { color: "#F5F5F5", fontSize: 12, fontWeight: "800" },
  mcCircle: { width: 22, height: 22, borderRadius: 11 },
  chip: { width: 34, height: 24, borderRadius: 6, borderWidth: 1, marginBottom: 10 },
  cardNum: { fontSize: 14, fontWeight: "700", letterSpacing: 3, marginBottom: 14 },
  cardBottom: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 1, marginBottom: 2 },
  cardValue: { fontSize: 11, fontWeight: "700" },
  balanceTag: {
    position: "absolute",
    bottom: 16,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  balanceText: { fontSize: 12, fontWeight: "800" },
  actions: { borderRadius: 20, padding: 16, borderWidth: 1, gap: 12, marginTop: 4 },
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
