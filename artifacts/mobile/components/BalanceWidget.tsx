import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  balance: number;
  upiLite?: number;
}

function formatBalance(n: number) {
  return n.toLocaleString("en-IN");
}

export function BalanceWidget({ balance, upiLite = 0 }: Props) {
  const colors = useColors();
  const [hidden, setHidden] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.topRow}>
        <Text style={[styles.walletLabel, { color: colors.mutedForeground }]}>TOTAL BALANCE</Text>
        <TouchableOpacity onPress={() => setHidden(!hidden)} style={styles.eyeBtn}>
          <Feather name={hidden ? "eye-off" : "eye"} size={16} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.balance, { color: colors.text }]}>
        {hidden ? "₹ ••••••" : `₹ ${formatBalance(balance)}`}
      </Text>

      {upiLite > 0 && (
        <View style={styles.upiLiteRow}>
          <View style={[styles.upiLiteDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.upiLiteText, { color: colors.mutedForeground }]}>
            UPI Lite: {hidden ? "₹••••" : `₹${formatBalance(upiLite)}`}
          </Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <Feather name="trending-up" size={11} color={colors.primary} />
            <Text style={[styles.pillText, { color: colors.text }]}>+12.4% this month</Text>
          </View>
        </View>
        <View style={[styles.glowCircle, { backgroundColor: colors.primary + "12" }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    overflow: "hidden",
    borderWidth: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  walletLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  eyeBtn: {
    padding: 2,
  },
  balance: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
    marginBottom: 8,
  },
  upiLiteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  upiLiteDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.6)",
  },
  upiLiteText: {
    fontSize: 12,
    fontWeight: "500",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  glowCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: "absolute",
    right: -20,
    bottom: -30,
  },
});
