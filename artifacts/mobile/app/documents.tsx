import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
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

import { useAuth } from "@/context/AuthContext";
import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { VaultDocument } from "@/types";
import BiometricPrompt from "@/app/biometric-prompt";

const DOC_INFO: Record<VaultDocument["type"], { label: string; icon: keyof typeof Feather.glyphMap; color: string; gradient: [string, string] }> = {
  aadhaar: { label: "Aadhaar Card", icon: "user", color: "#D06224", gradient: ["#3A1A10", "#1A1510"] },
  pan: { label: "PAN Card", icon: "credit-card", color: "#EAC891", gradient: ["#3A2A10", "#1A1510"] },
  driving_license: { label: "Driving License", icon: "navigation", color: "#2E7D32", gradient: ["#1A2A10", "#0F1A08"] },
  passport: { label: "Passport", icon: "bookmark", color: "#AE431E", gradient: ["#2A1510", "#1A0F08"] },
  vehicle_rc: { label: "Vehicle RC", icon: "truck", color: "#D06224", gradient: ["#3A1A10", "#1A1510"] },
};

const AVAILABLE_TYPES: VaultDocument["type"][] = [
  "aadhaar",
  "pan",
  "driving_license",
  "passport",
  "vehicle_rc",
];

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents, addDocument, removeDocument } = useWallet();
  const { verifyBiometric } = useAuth();
  const [showAdd, setShowAdd] = useState(false);
  const [biometricPending, setBiometricPending] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleAdd = (type: VaultDocument["type"]) => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const info = DOC_INFO[type];
    const alreadyHas = documents.some((d) => d.type === type);
    if (alreadyHas) {
      Alert.alert("Document exists", `${info.label} is already added.`);
      return;
    }
    const doc: VaultDocument = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      type,
      name: info.label,
      number: "XXXX-XXXX-XXXX",
    };
    addDocument(doc);
    setShowAdd(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert("Remove Document", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeDocument(id) },
    ]);
  };

  const handleViewDocument = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBiometricPending(true);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(500).delay(0)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Documents</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAdd(!showAdd);
          }}
        >
          <Feather name={showAdd ? "x" : "plus"} size={18} color={colors.primaryForeground} />
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={[styles.securityNote, { backgroundColor: colors.successLight }]}>
        <Feather name="shield" size={16} color={colors.success} />
        <Text style={[styles.securityText, { color: colors.success }]}>
          Documents are encrypted and stored securely on your device
        </Text>
      </Animated.View>

      {showAdd && (
        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.addSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Add Document</Text>
          <View style={styles.typeGrid}>
            {AVAILABLE_TYPES.map((type) => {
              const info = DOC_INFO[type];
              const exists = documents.some((d) => d.type === type);
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeCard,
                    { backgroundColor: colors.surface, borderColor: exists ? colors.success : colors.border },
                  ]}
                  onPress={() => handleAdd(type)}
                  activeOpacity={0.7}
                  disabled={exists}
                >
                  <View style={[styles.typeIcon, { backgroundColor: info.color + "20" }]}>
                    <Feather name={info.icon} size={20} color={info.color} />
                  </View>
                  <Text style={[styles.typeLabel, { color: exists ? colors.success : colors.text }]}>
                    {info.label}
                  </Text>
                  {exists && <Feather name="check-circle" size={14} color={colors.success} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      )}

      {documents.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Feather name="file-text" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Add your important documents for quick access
          </Text>
        </Animated.View>
      ) : (
        <View style={styles.docGrid}>
          {documents.map((doc, index) => {
            const info = DOC_INFO[doc.type];
            return (
              <Animated.View key={doc.id} entering={FadeInDown.duration(500).delay(300 + index * 100)}>
                <TouchableOpacity style={styles.docCardWrap} onPress={handleViewDocument} activeOpacity={0.9}>
                  <LinearGradient
                    colors={info.gradient}
                    style={styles.docCard}
                  >
                    <View style={styles.docTop}>
                      <View style={[styles.docIcon, { backgroundColor: info.color + "30" }]}>
                        <Feather name={info.icon} size={20} color={info.color} />
                      </View>
                      <TouchableOpacity onPress={() => handleDelete(doc.id, doc.name)}>
                        <Feather name="trash-2" size={16} color="rgba(255,255,255,0.4)" />
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.docName, { color: colors.primaryForeground }]}>{doc.name}</Text>
                    <Text style={styles.docNumber}>{doc.number}</Text>
                    {doc.expiry && (
                      <Text style={styles.docExpiry}>Expires: {doc.expiry}</Text>
                    )}
                    <View style={styles.verifiedBadge}>
                      <Feather name="check-circle" size={12} color={colors.success} />
                      <Text style={[styles.verifiedText, { color: colors.success }]}>Verified</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      )}
      <BiometricPrompt
        visible={biometricPending}
        title="View Document"
        subtitle="Authorize with biometrics to access your document"
        onSuccess={() => setBiometricPending(false)}
        onCancel={() => setBiometricPending(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: "800" },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  securityText: { fontSize: 12, flex: 1 },
  addSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  typeGrid: { gap: 8 },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  typeLabel: { flex: 1, fontSize: 15, fontWeight: "600" },
  docGrid: { gap: 12 },
  docCardWrap: { borderRadius: 20, overflow: "hidden" },
  docCard: { padding: 20, gap: 8 },
  docTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  docName: { fontSize: 16, fontWeight: "700", marginTop: 8 },
  docNumber: { color: "rgba(255,255,255,0.7)", fontSize: 14, letterSpacing: 1 },
  docExpiry: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  verifiedText: { fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", padding: 40, borderRadius: 20, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center" },
});
