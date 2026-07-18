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
import Animated, { FadeInDown } from "react-native-reanimated";

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
      contentContainerStyle={[styles.content, { paddingTop: topPad + 12, paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(400).delay(50)}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              router.back();
            }}
          >
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
      </Animated.View>

      {/* Avatar */}
      <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.avatarSection}>
        <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        {editing && (
          <TouchableOpacity style={[styles.changePhotoBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Feather name="camera" size={14} color={colors.primary} />
            <Text style={[styles.changePhotoText, { color: colors.primary }]}>Change Photo</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* Info */}
      <Animated.View entering={FadeInDown.duration(500).delay(150)}>
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
      </Animated.View>

      {/* KYC Status */}
      <Animated.View entering={FadeInDown.duration(500).delay(200)}>
        <LinearGradient
          colors={[colors.successLight + "15", colors.successLight + "05"]}
          style={[styles.kycCard, { borderColor: colors.successLight + "30" }]}
        >
          <View style={[styles.kycIcon, { backgroundColor: colors.successLight + "25" }]}>
            <Feather name="shield" size={20} color={colors.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.kycTitle, { color: colors.text }]}>KYC Verified</Text>
            <Text style={[styles.kycSub, { color: colors.success }]}>Your account is fully verified</Text>
          </View>
          <View style={[styles.kycBadge, { backgroundColor: colors.successLight + "30" }]}>
            <Text style={[styles.kycBadgeText, { color: colors.success }]}>FULL KYC</Text>
          </View>
        </LinearGradient>
      </Animated.View>
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
    marginBottom: 28,
  },
  title: { fontSize: 20, fontWeight: "800" },
  avatarSection: { alignItems: "center", gap: 12, marginBottom: 28 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#FFFDF9", fontSize: 30, fontWeight: "800" },
  changePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  changePhotoText: { fontSize: 12, fontWeight: "600" },
  infoCard: { borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  infoRow: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  infoLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: "600" },
  infoInput: {
    fontSize: 15,
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
    borderWidth: 1,
  },
  kycIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  kycTitle: { fontSize: 14, fontWeight: "700" },
  kycSub: { fontSize: 12, marginTop: 2 },
  kycBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  kycBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
});
