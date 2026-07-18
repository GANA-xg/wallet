import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import gradients from "@/constants/gradients";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";

interface Props {
  balance: number;
  upiLite?: number;
  font?: {
    regular: string;
    medium: string;
    semibold: string;
    bold: string;
    extrabold: string;
  };
}

function formatBalance(n: number) {
  return n.toLocaleString("en-IN");
}

export function BalanceWidget({ balance, upiLite = 0, font }: Props) {
  const colors = useColors();
  const [hidden, setHidden] = useState(false);

  return (
    <LinearGradient
      colors={[colors.primary, colors.primaryActive]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <Text
          style={[
            styles.walletLabel,
            { color: "rgba(255,255,255,0.65)", fontFamily: font?.medium },
          ]}
        >
          TOTAL BALANCE
        </Text>
        <Pressable
          onPress={() => {
            setHidden(!hidden);
          }}
          hitSlop={8}
        >
          <Feather
            name={hidden ? "eye-off" : "eye"}
            size={14}
            color="rgba(255,255,255,0.5)"
          />
        </Pressable>
      </View>

      <Text
        style={[
          styles.balance,
          { color: "#FFFFFF", fontFamily: font?.extrabold },
        ]}
      >
        {hidden ? "••••••" : `₹ ${formatBalance(balance)}`}
      </Text>

      <View style={styles.bottomRow}>
        <View style={styles.infoPills}>
          {upiLite > 0 && (
            <View style={styles.pill}>
              <View style={styles.pillDot} />
              <Text style={[styles.pillText, { fontFamily: font?.medium }]}>
                UPI Lite {hidden ? "••••" : `₹${formatBalance(upiLite)}`}
              </Text>
            </View>
          )}
          <View style={styles.pill}>
            <Feather name="trending-up" size={10} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.pillText, { fontFamily: font?.medium }]}>+12.4%</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    overflow: "hidden",
    minHeight: 140,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  walletLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
  },
  balance: {
    fontSize: 34,
    letterSpacing: -1,
    marginBottom: spacing.base,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoPills: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  pillDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.7)",
  },
  pillText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.8)",
  },
});
