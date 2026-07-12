import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "Aryan Sharma");
  const [email, setEmail] = useState("aryan.sharma@gmail.com");
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2);

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
        <Text style={[styles.title, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity
          onPress={async () => {
            if (editing && !saving) {
              setSaving(true);
              try {
                await updateUser({ name });
              } catch (err) {
                // Revert on failure
                setName(user?.name ?? "Aryan Sharma");
              } finally {
                setSaving(false);
              }
            }
            setEditing(!editing);
          }}
          disabled={saving}
        >
          <Feather name={saving ? "loader" : editing ? "check" : "edit-2"} size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <LinearGradient colors={["#F4F4F5", "#D4D4D8"]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        {editing && (
          <TouchableOpacity style={[styles.changePhotoBtn, { backgroundColor: colors.surface }]}>
            <Feather name="camera" size={14} color={colors.primary} />
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info */}
      <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
        {[
          { label: "Full Name", value: name, key: "name" },
          { label: "Phone", value: `+91 ${user?.phone ?? "98765 43210"}`, key: "phone" },
          { label: "Email", value: email, key: "email" },
          { label: "Date of Birth", value: "15 Aug 1998", key: "dob" },
          { label: "PAN", value: "ABCDE1234F", key: "pan" },
        ].map((item, i) => (
          <View
            key={item.key}
            style={[styles.infoRow, { borderBottomColor: colors.border }, i === 4 && { borderBottomWidth: 0 }]}
          >
            <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
            {editing && (item.key === "name" || item.key === "email") ? (
              <TextInput
                style={[styles.infoInput, { color: colors.text, borderColor: colors.border }]}
                value={item.key === "name" ? name : email}
                onChangeText={item.key === "name" ? setName : setEmail}
                selectionColor={colors.primary}
              />
            ) : (
              <Text style={[styles.infoValue, { color: colors.text }]}>{item.value}</Text>
            )}
          </View>
        ))}
      </View>

      {/* KYC Status */}
      <View style={[styles.kycCard, { backgroundColor: "#0a1a0a" }]}>
        <Feather name="check-circle" size={20} color="#22C55E" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.kycTitle, { color: colors.text }]}>KYC Verified</Text>
          <Text style={styles.kycSub}>Your account is fully verified</Text>
        </View>
        <View style={[styles.kycBadge]}>
          <Text style={styles.kycBadgeText}>FULL KYC</Text>
        </View>
      </View>
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
    marginBottom: 32,
  },
  title: { fontSize: 20, fontWeight: "800" },
  avatarSection: { alignItems: "center", gap: 12, marginBottom: 32 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  changePhotoText: { fontSize: 13, fontWeight: "600" },
  infoCard: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  infoRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  infoLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  infoValue: { fontSize: 16, fontWeight: "600" },
  infoInput: {
    fontSize: 16,
    fontWeight: "600",
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  kycCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 16,
  },
  kycTitle: { fontSize: 14, fontWeight: "700" },
  kycSub: { color: "#22C55E", fontSize: 12, marginTop: 2 },
  kycBadge: {
    backgroundColor: "#22C55E20",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kycBadgeText: { color: "#22C55E", fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
