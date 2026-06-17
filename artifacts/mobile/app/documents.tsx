import { Feather } from "@expo/vector-icons";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useWallet } from "@/context/WalletContext";
import { useColors } from "@/hooks/useColors";
import type { VaultDocument } from "@/types";

const DOC_INFO: Record<VaultDocument["type"], { label: string; icon: keyof typeof Feather.glyphMap; color: string; gradient: [string, string] }> = {
  aadhaar: { label: "Aadhaar Card", icon: "user", color: "#3B82F6", gradient: ["#1e3a5f", "#0f2040"] },
  pan: { label: "PAN Card", icon: "credit-card", color: "#F59E0B", gradient: ["#5f3e0f", "#3d2700"] },
  driving_license: { label: "Driving License", icon: "navigation", color: "#22C55E", gradient: ["#0f4a1e", "#073010"] },
  passport: { label: "Passport", icon: "bookmark", color: "#8B5CF6", gradient: ["#3b1f5f", "#200f40"] },
  vehicle_rc: { label: "Vehicle RC", icon: "truck", color: "#EF4444", gradient: ["#5f1f1f", "#400f0f"] },
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
  const [showAdd, setShowAdd] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleAdd = (type: VaultDocument["type"]) => {
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
    Alert.alert("Remove Document", `Remove ${name}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeDocument(id) },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Documents</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAdd(!showAdd)}
        >
          <Feather name={showAdd ? "x" : "plus"} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.securityNote, { backgroundColor: "#0a1a0a" }]}>
        <Feather name="shield" size={16} color="#22C55E" />
        <Text style={styles.securityText}>
          Documents are encrypted and stored securely on your device
        </Text>
      </View>

      {showAdd && (
        <View style={styles.addSection}>
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
        </View>
      )}

      {documents.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.surface }]}>
          <Feather name="file-text" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No documents yet</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Add your important documents for quick access
          </Text>
        </View>
      ) : (
        <View style={styles.docGrid}>
          {documents.map((doc) => {
            const info = DOC_INFO[doc.type];
            return (
              <View key={doc.id} style={styles.docCardWrap}>
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
                  <Text style={styles.docName}>{doc.name}</Text>
                  <Text style={styles.docNumber}>{doc.number}</Text>
                  {doc.expiry && (
                    <Text style={styles.docExpiry}>Expires: {doc.expiry}</Text>
                  )}
                  <View style={styles.verifiedBadge}>
                    <Feather name="check-circle" size={12} color="#22C55E" />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                </LinearGradient>
              </View>
            );
          })}
        </View>
      )}
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
  securityText: { color: "#22C55E", fontSize: 12, flex: 1 },
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
  docName: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 8 },
  docNumber: { color: "rgba(255,255,255,0.7)", fontSize: 14, letterSpacing: 1 },
  docExpiry: { color: "rgba(255,255,255,0.5)", fontSize: 12 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  verifiedText: { color: "#22C55E", fontSize: 12, fontWeight: "600" },
  empty: { alignItems: "center", padding: 40, borderRadius: 20, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptySub: { fontSize: 14, textAlign: "center" },
});
