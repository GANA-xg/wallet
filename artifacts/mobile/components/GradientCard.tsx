import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import type { CardNetwork, CardRecord } from "@/types";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 48;
const CARD_HEIGHT = CARD_WIDTH * 0.58;

interface Props {
  card: CardRecord;
  style?: object;
}

function CardTypeLogo({ network }: { network: CardNetwork }) {
  if (network === "visa") {
    return <Text style={styles.cardTypeLogo}>VISA</Text>;
  }
  if (network === "mastercard") {
    return (
      <View style={styles.mastercardWrapper}>
        <View style={[styles.mcCircle, { backgroundColor: "#EB001B", marginRight: -10 }]} />
        <View style={[styles.mcCircle, { backgroundColor: "#F79E1B", opacity: 0.9 }]} />
      </View>
    );
  }
  if (network === "rupay") return <Text style={styles.networkText}>RuPay</Text>;
  if (network === "amex") return <Text style={styles.networkText}>AMEX</Text>;
  if (network === "discover") return <Text style={styles.networkText}>Discover</Text>;
  return <Text style={styles.networkText}>CARD</Text>;
}

const DEFAULT_GRADIENT: [string, string] = ["#2A2520", "#1A1510"];

export function GradientCard({ card, style }: Props) {
  const gradientColors: [string, string] = card.theme?.gradientColors?.length >= 2
    ? [card.theme.gradientColors[0], card.theme.gradientColors[1]]
    : DEFAULT_GRADIENT;
  const network = card.cardNetwork ?? "visa";
  const lastFour = card.lastFour ?? "0000";

  return (
    <View style={[styles.container, style]}>
      <View style={styles.card}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {card.frozen && (
            <View style={styles.frozenBanner}>
              <Feather name="lock" size={12} color="#fff" />
              <Text style={styles.frozenText}>FROZEN</Text>
            </View>
          )}

          <View style={styles.topRow}>
            <Text style={styles.bankName}>{card.issuer ?? "Card"}</Text>
            <CardTypeLogo network={network} />
          </View>

          <View style={styles.chipRow}>
            <View style={styles.chip} />
          </View>

          <Text style={styles.cardNumber}>•••• •••• •••• {lastFour}</Text>

          <View style={styles.bottomRow}>
            <View>
              <Text style={styles.label}>EXPIRES</Text>
              <Text style={styles.value}>
                {String(card.expiryMonth ?? "").padStart(2, "0")}/{String(card.expiryYear ?? "").slice(-2)}
              </Text>
            </View>
            <View>
              <Text style={styles.label}>{network.toUpperCase()}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: CARD_WIDTH, height: CARD_HEIGHT },
  card: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  gradient: { flex: 1, padding: 20 },
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
  frozenText: { color: "#FFFDF9", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bankName: { color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: "600", letterSpacing: 0.5 },
  cardTypeLogo: { color: "#FFFDF9", fontSize: 18, fontWeight: "900", fontStyle: "italic", letterSpacing: 1 },
  mastercardWrapper: { flexDirection: "row", alignItems: "center" },
  mcCircle: { width: 22, height: 22, borderRadius: 11 },
  networkText: { color: "#FFFDF9", fontSize: 13, fontWeight: "800" },
  chipRow: { marginTop: 14, marginBottom: 10 },
  chip: {
    width: 36,
    height: 26,
    backgroundColor: "rgba(255,215,100,0.5)",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,215,100,0.6)",
  },
  cardNumber: { color: "#FFFDF9", fontSize: 15, fontWeight: "500", letterSpacing: 3, marginBottom: 14 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  label: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: "600", letterSpacing: 1, marginBottom: 2 },
  value: { color: "#FFFDF9", fontSize: 12, fontWeight: "600" },
});
