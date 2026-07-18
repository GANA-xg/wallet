import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import type { Transaction } from "@/types";

const CATEGORY_ICONS: Record<string, string> = {
  food: "coffee",
  shopping: "shopping-bag",
  transport: "navigation",
  entertainment: "film",
  transfer: "send",
  health: "heart",
  utility: "zap",
  reward: "gift",
  default: "circle",
};

function formatAmount(amount: number) {
  return amount.toLocaleString("en-IN");
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface Props {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionItem({ transaction, onPress }: Props) {
  const colors = useColors();
  const icon = (CATEGORY_ICONS[transaction.category] ?? CATEGORY_ICONS.default) as keyof typeof Feather.glyphMap;
  const isCredit = transaction.type === "credit";
  const amountColor = isCredit ? colors.success : colors.text;
  const iconColor = isCredit ? colors.success : colors.textSecondary;

  return (
    <TouchableOpacity
      style={[styles.container, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
        <Feather name={icon} size={16} color={iconColor} />
      </View>

      <View style={styles.info}>
        <Text style={[styles.merchant, { color: colors.text }]} numberOfLines={1}>
          {transaction.merchant}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>
          {formatDate(transaction.date)}
          {transaction.status === "pending"
            ? " · Pending"
            : transaction.status === "launched"
            ? " · Launched"
            : ""}
        </Text>
      </View>

      <View style={styles.right}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {isCredit ? "+" : "−"}₹{formatAmount(transaction.amount)}
        </Text>
        {transaction.status === "failed" && (
          <Text style={[styles.failedBadge, { color: colors.error }]}>Failed</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  merchant: {
    fontSize: 14,
    fontWeight: "600",
  },
  date: {
    fontSize: 12,
  },
  right: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 14,
    fontWeight: "700",
  },
  failedBadge: {
    fontSize: 11,
  },
});
