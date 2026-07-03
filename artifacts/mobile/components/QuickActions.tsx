import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

const ACTIONS = [
  { id: "pay", label: "Pay", icon: "maximize" as const, route: "/pay" as const },
  { id: "send", label: "Send", icon: "send" as const, route: "/send" as const },
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
      {ACTIONS.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={styles.action}
          activeOpacity={0.7}
          onPress={() => handlePress(action.route)}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name={action.icon} size={20} color={colors.primary} />
          </View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  action: {
    alignItems: "center",
    gap: 6,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
  },
});
