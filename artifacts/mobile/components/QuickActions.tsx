import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import iconSizes from "@/constants/icons";

const PRIMARY_ACTIONS = [
  { id: "pay", label: "Scan & Pay", icon: "maximize" as const, route: "/pay" as const },
  { id: "send", label: "Send Money", icon: "send" as const, route: "/send" as const },
];

const SECONDARY_ACTIONS = [
  { id: "receive", label: "Receive", icon: "download" as const, route: "/receive" as const },
  { id: "bills", label: "Bills", icon: "file-text" as const, route: "/rewards" as const },
  { id: "recharge", label: "Recharge", icon: "smartphone" as const, route: "/rewards" as const },
];

export function QuickActions() {
  const colors = useColors();

  const handlePress = (route: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(route as never);
  };

  return (
    <View style={styles.container}>
      {/* Primary CTAs — solid primary color, no gradient */}
      <View style={styles.primaryRow}>
        {PRIMARY_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: pressed ? colors.primaryActive : colors.primary },
            ]}
            onPress={() => handlePress(action.route)}
          >
            <Feather name={action.icon} size={iconSizes.lg} color={colors.primaryForeground} />
            <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Secondary actions — clean, no container card */}
      <View style={styles.secondaryRow}>
        {SECONDARY_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            style={[styles.secondaryBtn, { backgroundColor: colors.surfaceElevated }]}
            onPress={() => handlePress(action.route)}
          >
            <Feather name={action.icon} size={iconSizes.md} color={colors.textSecondary} />
            <Text style={[styles.secondaryLabel, { color: colors.textSecondary }]}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  primaryRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 16,
    borderRadius: radius.full,
  },
  primaryLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.base,
    borderRadius: radius.full,
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
});
