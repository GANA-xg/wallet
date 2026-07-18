import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface Props {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: Props) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
          <Text style={[styles.action, { color: colors.primary }]}>{actionLabel}</Text>
          <Feather name="chevron-right" size={14} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  action: {
    fontSize: 13,
    fontWeight: "700",
  },
});
