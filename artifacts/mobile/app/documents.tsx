import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useCallback } from "react";
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
import type { VaultDocument, DocumentType } from "@/types";
import BiometricPrompt from "@/app/biometric-prompt";
import DocumentCard from "@/components/DocumentCard";
import AddDocumentSheet from "@/components/AddDocumentSheet";
import spacing from "@/constants/spacing";
import radius from "@/constants/radius";

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents, addDocument, removeDocument } = useWallet();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const existingTypes = documents.map((d) => d.type);

  const handleAddDocument = useCallback((doc: VaultDocument) => {
    addDocument(doc);
  }, [addDocument]);

  const handleCardPress = useCallback((doc: VaultDocument) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingDocId(doc.id);
    setBiometricPending(true);
  }, []);

  const handleBiometricSuccess = useCallback(() => {
    setBiometricPending(false);
    if (pendingDocId) {
      router.push(`/document-detail?id=${pendingDocId}` as never);
      setPendingDocId(null);
    }
  }, [pendingDocId]);

  const handleBiometricCancel = useCallback(() => {
    setBiometricPending(false);
    setPendingDocId(null);
  }, []);

  const handleDeleteDocument = useCallback((doc: VaultDocument) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Remove Document",
      `Remove ${doc.name}${doc.holderName ? ` (${doc.holderName})` : ""}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeDocument(doc.id),
        },
      ]
    );
  }, [removeDocument]);

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
          <Text style={[styles.title, { color: colors.text }]}>Documents</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAddSheet(true);
            }}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(400).delay(80)}
          style={[styles.securityBanner, { backgroundColor: colors.success + "12" }]}
        >
          <Feather name="shield" size={16} color={colors.success} />
          <Text style={[styles.securityText, { color: colors.success }]}>
            Your documents are encrypted and stored securely on-device
          </Text>
        </Animated.View>

        {documents.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Feather name="file-plus" size={48} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Documents Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Securely store your IDs, licenses, certificates and important documents.
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAddSheet(true);
              }}
              activeOpacity={0.8}
            >
              <Feather name="plus" size={18} color={colors.primaryForeground} />
              <Text style={[styles.emptyCtaText, { color: colors.primaryForeground }]}>Add Document</Text>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <View style={styles.docList}>
            {documents.map((doc, index) => (
              <Animated.View key={doc.id} entering={FadeInDown.duration(400).delay(150 + index * 60)}>
                <TouchableOpacity
                  onLongPress={() => handleDeleteDocument(doc)}
                  activeOpacity={1}
                >
                  <DocumentCard document={doc} onPress={handleCardPress} />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
      </ScrollView>

      <AddDocumentSheet
        visible={showAddSheet}
        onClose={() => setShowAddSheet(false)}
        onAdd={handleAddDocument}
        existingTypes={existingTypes}
      />

      <BiometricPrompt
        visible={biometricPending}
        title="Authenticate"
        subtitle="Use Face ID / Fingerprint to securely view this document"
        onSuccess={handleBiometricSuccess}
        onCancel={handleBiometricCancel}
      />
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
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    justifyContent: "center",
    alignItems: "center",
  },
  securityBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  securityText: { fontSize: 12, flex: 1, lineHeight: 16 },
  docList: { gap: spacing.md },
  emptyState: {
    alignItems: "center",
    paddingTop: spacing["3xl"],
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderRadius: radius.lg,
  },
  emptyCtaText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
