import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useCallback } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import { DOC_CONFIG } from "@/constants/documentConfig";
import type { VaultDocument, VerificationStatus } from "@/types";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "--";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function VerificationBadge({ status }: { status: VerificationStatus }) {
  const colors = useColors();
  const config = {
    verified: { icon: "check-circle" as const, label: "Verified", bg: colors.success + "15", fg: colors.success },
    pending: { icon: "clock" as const, label: "Pending", bg: colors.warning + "15", fg: colors.warning },
    failed: { icon: "x-circle" as const, label: "Failed", bg: colors.error + "15", fg: colors.error },
    unverified: { icon: "alert-circle" as const, label: "Unverified", bg: colors.surfaceElevated, fg: colors.textTertiary },
  }[status];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Feather name={config.icon} size={12} color={config.fg} />
      <Text style={[styles.badgeText, { color: config.fg }]}>{config.label}</Text>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
  icon: keyof typeof Feather.glyphMap;
  last?: boolean;
}

function InfoRow({ label, value, colors, icon, last }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, !last && { borderBottomColor: colors.border }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.surfaceElevated }]}>
        <Feather name={icon} size={14} color={colors.textTertiary} />
      </View>
      <View style={styles.infoContent}>
        <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.text }]}>{value || "--"}</Text>
      </View>
    </View>
  );
}

export default function DocumentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents, removeDocument } = useWallet();

  const document = useMemo(() => documents.find((d) => d.id === id), [documents, id]);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleDelete = useCallback(() => {
    if (!document) return;
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Document",
      "This action cannot be undone. Are you sure you want to delete this document?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeDocument(document.id);
            router.back();
          },
        },
      ]
    );
  }, [document, removeDocument]);

  const handleShare = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Share", "Document sharing will be available in a future update.");
  }, []);

  const handleDownload = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Download", "Document download will be available in a future update.");
  }, []);

  const handleViewOriginal = useCallback(() => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("View Original", "Original document view will be available in a future update.");
  }, []);

  if (!document) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPad + spacing.base }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Document</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.notFound}>
          <Feather name="alert-circle" size={48} color={colors.textTertiary} />
          <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>Document not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.notFoundLink, { color: colors.primary }]}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const config = DOC_CONFIG[document.type] ?? DOC_CONFIG.custom;
  const meta = document.metadata;

  const infoRows: { label: string; value: string; icon: keyof typeof Feather.glyphMap }[] = [
    { label: "Full Name", value: document.holderName, icon: "user" },
    { label: "Document Number", value: document.documentNumber, icon: "hash" },
  ];

  if (meta.fatherName) infoRows.push({ label: "Father's Name", value: meta.fatherName, icon: "user" });
  if (meta.gender) infoRows.push({ label: "Gender", value: meta.gender, icon: "users" });
  if (meta.dateOfBirth) infoRows.push({ label: "Date of Birth", value: formatDate(meta.dateOfBirth), icon: "calendar" });
  if (meta.nationality) infoRows.push({ label: "Nationality", value: meta.nationality, icon: "globe" });
  if (meta.address) infoRows.push({ label: "Address", value: meta.address, icon: "map-pin" });
  if (meta.issueDate) infoRows.push({ label: "Issue Date", value: formatDate(meta.issueDate), icon: "calendar" });
  if (meta.expiryDate) infoRows.push({ label: "Expiry Date", value: formatDate(meta.expiryDate), icon: "calendar" });
  if (meta.vehicleClass) infoRows.push({ label: "Vehicle Class", value: meta.vehicleClass, icon: "truck" });
  if (meta.vehicleModel) infoRows.push({ label: "Vehicle Model", value: meta.vehicleModel, icon: "truck" });
  if (meta.fuelType) infoRows.push({ label: "Fuel Type", value: meta.fuelType, icon: "droplet" });
  if (meta.chassisNumber) infoRows.push({ label: "Chassis Number", value: meta.chassisNumber, icon: "hash" });
  if (meta.engineNumber) infoRows.push({ label: "Engine Number", value: meta.engineNumber, icon: "hash" });
  if (meta.registrationNumber) infoRows.push({ label: "Registration Number", value: meta.registrationNumber, icon: "hash" });
  if (meta.licenceNumber) infoRows.push({ label: "Licence Number", value: meta.licenceNumber, icon: "hash" });
  if (meta.passportNumber) infoRows.push({ label: "Passport Number", value: meta.passportNumber, icon: "hash" });
  if (meta.organization) infoRows.push({ label: "Organization", value: meta.organization, icon: "briefcase" });

  if (meta.customFields) {
    Object.entries(meta.customFields).forEach(([key, value]) => {
      infoRows.push({ label: key, value, icon: "file-text" });
    });
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + spacing.base, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + spacing["2xl"] },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(0)} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Document Details</Text>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Feather name="trash-2" size={18} color={colors.error} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[styles.docHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.docIcon, { backgroundColor: config.color + "15" }]}>
            <Feather name={config.icon} size={28} color={config.color} />
          </View>
          <View style={styles.docInfo}>
            <Text style={[styles.docType, { color: colors.text }]}>{document.name}</Text>
            <VerificationBadge status={document.verificationStatus} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(160)} style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Information</Text>
          {infoRows.map((row, i) => (
            <InfoRow
              key={row.label}
              label={row.label}
              value={row.value}
              icon={row.icon}
              colors={colors}
              last={i === infoRows.length - 1}
            />
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(240)} style={styles.actionsSection}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleViewOriginal}
            activeOpacity={0.7}
          >
            <Feather name="eye" size={18} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>View Original</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleDownload}
            activeOpacity={0.7}
          >
            <Feather name="download" size={18} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Download</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <Feather name="share-2" size={18} color={colors.primary} />
            <Text style={[styles.actionLabel, { color: colors.text }]}>Share</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(320)} style={[styles.metaSection, { backgroundColor: colors.surfaceElevated }]}>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Created</Text>
            <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{formatDate(document.createdAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.metaLabel, { color: colors.textTertiary }]}>Last Updated</Text>
            <Text style={[styles.metaValue, { color: colors.textSecondary }]}>{formatDate(document.updatedAt)}</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.base, gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.base,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  title: { fontSize: 20, fontWeight: "800" },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  docHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.base,
  },
  docIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  docInfo: {
    flex: 1,
    gap: 4,
  },
  docType: {
    fontSize: 17,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  infoSection: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  actionsSection: {
    gap: spacing.sm,
    marginBottom: spacing.base,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.base,
    borderRadius: radius.lg,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  metaSection: {
    borderRadius: radius.md,
    padding: spacing.base,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "500",
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  notFoundText: {
    fontSize: 16,
    fontWeight: "600",
  },
  notFoundLink: {
    fontSize: 14,
    fontWeight: "600",
  },
});
