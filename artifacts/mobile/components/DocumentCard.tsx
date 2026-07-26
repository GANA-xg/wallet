import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { DOC_CONFIG } from "@/constants/documentConfig";
import type { VaultDocument } from "@/types";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";
import iconSizes from "@/constants/icons";

interface DocumentCardProps {
  document: VaultDocument;
  onPress: (document: VaultDocument) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export default function DocumentCard({ document, onPress }: DocumentCardProps) {
  const colors = useColors();
  const config = DOC_CONFIG[document.type] ?? DOC_CONFIG.custom;

  const handlePress = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(document);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconWrap, { backgroundColor: config.color + "15" }]}>
        <Feather name={config.icon} size={iconSizes.xl} color={config.color} />
      </View>

      <View style={styles.info}>
        <View style={styles.topRow}>
          <Text style={[styles.type, { color: colors.text }]} numberOfLines={1}>
            {config.label}
          </Text>
          {document.verificationStatus === "verified" && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.success + "15" }]}>
              <Feather name="check-circle" size={iconSizes.badge} color={colors.success} />
              <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
            </View>
          )}
          {document.verificationStatus === "pending" && (
            <View style={[styles.pendingBadge, { backgroundColor: colors.warning + "15" }]}>
              <Feather name="clock" size={iconSizes.badge} color={colors.warning} />
            </View>
          )}
        </View>

        {document.holderName ? (
          <Text style={[styles.holder, { color: colors.textSecondary }]} numberOfLines={1}>
            {document.holderName}
          </Text>
        ) : null}

        <Text style={[styles.number, { color: colors.textTertiary }]} numberOfLines={1}>
          {document.maskedNumber}
        </Text>

        <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
          {formatRelativeTime(document.updatedAt)}
        </Text>
      </View>

      <Feather name="chevron-right" size={iconSizes.sm} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  type: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "600",
  },
  pendingBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  holder: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 1,
  },
  number: {
    fontSize: 13,
    fontFamily: "Geist_500Medium",
    letterSpacing: 1,
    marginTop: 1,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
});
